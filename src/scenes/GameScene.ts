import Phaser from "phaser";
import { Pathfinder } from "../ai/Pathfinder";
import { SlotCoordinator } from "../ai/SlotCoordinator";
import { MAP_HEIGHT, MAP_WIDTH, PACK_ALERT_RADIUS } from "../config";
import { DebugOverlay } from "../debug/DebugOverlay";
import { Bullet } from "../entities/Bullet";
import { type Enemy, EnemyState } from "../entities/Enemy";
import { MeleeEnemy } from "../entities/MeleeEnemy";
import { Player } from "../entities/Player";
import { ShooterEnemy } from "../entities/ShooterEnemy";
import type { LevelData } from "../level/level1";
import type { WallDef } from "../types";
import { GAME_OVER_SCENE_KEY } from "./GameOverScene";
import { LEVEL_SELECT_SCENE_KEY } from "./LevelSelectScene";

const DEBUG_MELEE_COLOR = 0xff4444;
const DEBUG_SHOOTER_COLOR = 0x4444ff;
const DEBUG_SLOT_COLOR = 0xffff00;

const WALL_COLOR = 0x555566;

export const GAME_SCENE_KEY = "Game";

/** Determines how the scene loads its map and spawns. */
export type LevelConfig = { mode: "tilemap"; key: string } | { mode: "data"; data: LevelData };

/** Extract WallDef[] from a Tiled wall layer for LoS checks and pathfinding. */
function extractWallsFromLayer(wallLayer: Phaser.Tilemaps.TilemapLayer): WallDef[] {
  const walls: WallDef[] = [];
  wallLayer.forEachTile((tile) => {
    if (tile.index !== -1) {
      walls.push({
        x: tile.pixelX + tile.width / 2,
        y: tile.pixelY + tile.height / 2,
        w: tile.width,
        h: tile.height,
      });
    }
  });
  return walls;
}

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private playerBullets!: Phaser.Physics.Arcade.Group;
  private enemyBullets!: Phaser.Physics.Arcade.Group;
  private enemyGroup!: Phaser.Physics.Arcade.Group;
  private coordinator!: SlotCoordinator;
  private pathfinder!: Pathfinder;
  private pathGraphics!: Phaser.GameObjects.Graphics;
  private debugPaths = false;
  private gameOver = false;
  private hasEnemies = false;
  private levelConfig: LevelConfig = { mode: "tilemap", key: "level1-map" };

  constructor() {
    super(GAME_SCENE_KEY);
  }

  init(data: { level?: LevelConfig }): void {
    this.levelConfig = data.level ?? { mode: "tilemap", key: "level1-map" };
    this.gameOver = false;
    this.hasEnemies = false;
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#1a1a1a");

    this.playerBullets = this.physics.add.group({ classType: Bullet, runChildUpdate: true });
    this.enemyBullets = this.physics.add.group({ classType: Bullet, runChildUpdate: true });
    this.enemyGroup = this.physics.add.group();
    this.coordinator = new SlotCoordinator();
    this.pathGraphics = this.add.graphics().setDepth(50);

    // Load level — returns map dimensions for camera/world bounds
    const { mapW, mapH } =
      this.levelConfig.mode === "tilemap"
        ? this.loadTiledLevel(this.levelConfig.key)
        : this.loadDataLevel(this.levelConfig.data);

    // Enemy↔enemy collision (mode-independent)
    this.physics.add.collider(this.enemyGroup, this.enemyGroup);

    // Enemy bullets → player
    this.physics.add.overlap(this.enemyBullets, this.player, (_playerObj, bulletObj) => {
      const bullet = bulletObj as Bullet;
      const dmg = bullet.damage;
      bullet.destroy();
      this.player.takeDamage(dmg);
    });

    // Player bullets → enemies
    this.physics.add.overlap(
      this.playerBullets,
      this.enemyGroup,
      (bulletObj, enemyObj) => {
        const bullet = bulletObj as Bullet;
        const enemy = enemyObj as Enemy;
        bullet.destroy();
        enemy.takeDamage(bullet.damage);
      },
      undefined,
      this,
    );

    this.events.on("requestSlot", (enemy: Enemy) => {
      this.coordinator.assignSlot(enemy, this.player);
    });

    this.events.on("packAlert", (x: number, y: number) => {
      for (const obj of this.enemyGroup.getChildren()) {
        const e = obj as Enemy;
        if (e.state === EnemyState.IDLE) {
          const d = Phaser.Math.Distance.Between(x, y, e.x, e.y);
          if (d < PACK_ALERT_RADIUS) {
            this.coordinator.assignSlot(e, this.player);
            e.state = EnemyState.CHASE;
          }
        }
      }
    });

    this.events.on("enemyDied", (e: Enemy) => {
      this.coordinator.releaseSlot(e);
    });

    this.events.on("releaseSlot", (e: Enemy) => {
      this.coordinator.releaseSlot(e);
    });

    this.cameras.main.startFollow(this.player);
    this.cameras.main.setBounds(0, 0, mapW, mapH);

    this.events.once("playerDied", () => {
      this.gameOver = true;
      this.scene.start(GAME_OVER_SCENE_KEY, { win: false });
    });

    this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).once("down", () => {
      this.scene.start(LEVEL_SELECT_SCENE_KEY);
    });

    this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.F1).on("down", () => {
      this.debugPaths = !this.debugPaths;
      if (!this.debugPaths) this.pathGraphics.clear();
    });

    new DebugOverlay(this, this.player, this.enemyGroup);
  }

  override update(): void {
    if (this.gameOver) return;

    if (this.player.active) this.player.update();

    for (const enemy of this.enemyGroup.getChildren()) {
      if (enemy.active) (enemy as Enemy).tick(this.player);
    }

    if (this.hasEnemies && this.enemyGroup.countActive(true) === 0) {
      this.gameOver = true;
      this.scene.start(GAME_OVER_SCENE_KEY, { win: true });
    }

    if (this.debugPaths) this.drawDebugPaths();
  }

  private drawDebugPaths(): void {
    this.pathGraphics.clear();

    for (const obj of this.enemyGroup.getChildren()) {
      const enemy = obj as Enemy;
      if (!enemy.active) continue;

      const isMelee = enemy instanceof MeleeEnemy;
      const lineColor = isMelee ? DEBUG_MELEE_COLOR : DEBUG_SHOOTER_COLOR;
      const waypoints = enemy.getWaypoints();

      if (waypoints.length > 0) {
        this.pathGraphics.lineStyle(2, lineColor, 0.8);
        this.pathGraphics.beginPath();
        this.pathGraphics.moveTo(enemy.x, enemy.y);
        for (const wp of waypoints) {
          this.pathGraphics.lineTo(wp.x, wp.y);
        }
        this.pathGraphics.strokePath();
      }

      const target = enemy.getLastPathTarget();
      if (target) {
        const cross = 8;
        this.pathGraphics.lineStyle(2, DEBUG_SLOT_COLOR, 0.9);
        this.pathGraphics.beginPath();
        this.pathGraphics.moveTo(target.x - cross, target.y);
        this.pathGraphics.lineTo(target.x + cross, target.y);
        this.pathGraphics.moveTo(target.x, target.y - cross);
        this.pathGraphics.lineTo(target.x, target.y + cross);
        this.pathGraphics.strokePath();
      }
    }
  }

  /**
   * Loads a level from a Tiled JSON tilemap.
   * Requires PreloadScene to have loaded the tileset image and tilemap JSON.
   * Layers expected: "floor" (visual), "walls" (collision), "spawns" (objects).
   * Object types in "spawns": "player_start", "melee", "shooter".
   */
  private loadTiledLevel(tilemapKey: string): { mapW: number; mapH: number } {
    const map = this.make.tilemap({ key: tilemapKey });
    const mapW = map.widthInPixels;
    const mapH = map.heightInPixels;

    this.physics.world.setBounds(0, 0, mapW, mapH);

    const tileset = map.addTilesetImage("tilesheet_complete", "tiles-kenney");
    if (!tileset) {
      console.error("[GameScene] Failed to add tileset 'tilesheet_complete'");
      return this.fallbackLevel(mapW || MAP_WIDTH, mapH || MAP_HEIGHT);
    }

    // Floor layer — visual only, no collision
    map.createLayer("floor", tileset, 0, 0);

    // Wall layer — all placed tiles are solid.
    // Cast: we use the default (non-GPU) tilemap renderer throughout this project.
    const wallLayer = map.createLayer(
      "walls",
      tileset,
      0,
      0,
    ) as Phaser.Tilemaps.TilemapLayer | null;
    if (!wallLayer) {
      console.error("[GameScene] No 'walls' layer found in tilemap");
      return this.fallbackLevel(mapW, mapH);
    }
    wallLayer.setCollisionByExclusion([-1]);

    // Extract geometry for LoS and pathfinding
    const walls = extractWallsFromLayer(wallLayer);
    this.pathfinder = new Pathfinder(walls, mapW, mapH);

    // Wall colliders for physics movement
    // (player is created from spawns, so we set up colliders after spawning)
    const spawnObjects = map.getObjectLayer("spawns")?.objects ?? [];
    let playerCreated = false;

    for (const obj of spawnObjects) {
      const ox = obj.x ?? 100;
      const oy = obj.y ?? 100;

      if (obj.type === "player_start") {
        this.player = new Player(this, ox, oy, this.playerBullets);
        playerCreated = true;
      } else if (obj.type === "melee") {
        const e = new MeleeEnemy(this, ox, oy, walls);
        e.setPathfinder(this.pathfinder);
        this.enemyGroup.add(e);
      } else if (obj.type === "shooter") {
        const e = new ShooterEnemy(this, ox, oy, this.enemyBullets, walls);
        e.setPathfinder(this.pathfinder);
        this.enemyGroup.add(e);
      }
    }

    if (!playerCreated) {
      console.warn(
        "[GameScene] No 'player_start' object in spawns layer — using fallback (100, 100)",
      );
      this.player = new Player(this, 100, 100, this.playerBullets);
    }
    this.hasEnemies = this.enemyGroup.getLength() > 0;

    // Wall physics colliders
    this.physics.add.collider(this.player, wallLayer);
    this.physics.add.collider(this.enemyGroup, wallLayer);
    this.physics.add.collider(this.playerBullets, wallLayer, (bullet) => {
      (bullet as Phaser.GameObjects.GameObject).destroy();
    });
    this.physics.add.collider(this.enemyBullets, wallLayer, (bullet) => {
      (bullet as Phaser.GameObjects.GameObject).destroy();
    });

    return { mapW, mapH };
  }

  /**
   * Loads a level from a TypeScript LevelData object (test levels 2–7).
   * Walls are rendered as coloured rectangles with static physics bodies.
   */
  private loadDataLevel(data: LevelData): { mapW: number; mapH: number } {
    const mapW = data.width ?? MAP_WIDTH;
    const mapH = data.height ?? MAP_HEIGHT;

    this.physics.world.setBounds(0, 0, mapW, mapH);

    const wallGroup = this.physics.add.staticGroup();
    const walls = data.walls;

    for (const { x, y, w, h } of walls) {
      const rect = this.add.rectangle(x, y, w, h, WALL_COLOR);
      this.physics.add.existing(rect, true);
      wallGroup.add(rect);
    }

    this.pathfinder = new Pathfinder(walls, mapW, mapH);

    this.player = new Player(this, data.playerStart.x, data.playerStart.y, this.playerBullets);

    for (const spawn of data.enemySpawns) {
      let enemy: MeleeEnemy | ShooterEnemy;
      if (spawn.type === "melee") {
        enemy = new MeleeEnemy(this, spawn.x, spawn.y, walls);
      } else {
        enemy = new ShooterEnemy(this, spawn.x, spawn.y, this.enemyBullets, walls);
      }
      enemy.setPathfinder(this.pathfinder);
      this.enemyGroup.add(enemy);
    }
    this.hasEnemies = data.enemySpawns.length > 0;

    // Wall physics colliders
    this.physics.add.collider(this.player, wallGroup);
    this.physics.add.collider(this.enemyGroup, wallGroup);
    this.physics.add.collider(this.playerBullets, wallGroup, (bullet) => {
      (bullet as Phaser.GameObjects.GameObject).destroy();
    });
    this.physics.add.collider(this.enemyBullets, wallGroup, (bullet) => {
      (bullet as Phaser.GameObjects.GameObject).destroy();
    });

    return { mapW, mapH };
  }

  /** Emergency fallback: creates a minimal empty arena when tilemap loading fails. */
  private fallbackLevel(mapW: number, mapH: number): { mapW: number; mapH: number } {
    this.pathfinder = new Pathfinder([], mapW, mapH);
    this.player = new Player(this, 100, 100, this.playerBullets);
    return { mapW, mapH };
  }
}
