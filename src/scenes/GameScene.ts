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
import { level1 } from "../level/level1";
import { GAME_OVER_SCENE_KEY } from "./GameOverScene";
import { LEVEL_SELECT_SCENE_KEY } from "./LevelSelectScene";

const DEBUG_MELEE_COLOR = 0xff4444;
const DEBUG_SHOOTER_COLOR = 0x4444ff;
const DEBUG_SLOT_COLOR = 0xffff00;

const WALL_COLOR = 0x555566;

export const GAME_SCENE_KEY = "Game";

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private wallGroup!: Phaser.Physics.Arcade.StaticGroup;
  private playerBullets!: Phaser.Physics.Arcade.Group;
  private enemyBullets!: Phaser.Physics.Arcade.Group;
  private enemyGroup!: Phaser.Physics.Arcade.Group;
  private coordinator!: SlotCoordinator;
  private pathfinder!: Pathfinder;
  private pathGraphics!: Phaser.GameObjects.Graphics;
  private debugPaths = false;
  private gameOver = false;
  private hasEnemies = false;
  private levelData: LevelData = level1;

  constructor() {
    super(GAME_SCENE_KEY);
  }

  init(data: { level?: LevelData }): void {
    this.levelData = data.level ?? level1;
    this.gameOver = false;
    this.hasEnemies = false;
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#1a1a1a");
    this.physics.world.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);

    this.wallGroup = this.physics.add.staticGroup();
    this.playerBullets = this.physics.add.group({ classType: Bullet, runChildUpdate: true });
    this.enemyBullets = this.physics.add.group({ classType: Bullet, runChildUpdate: true });
    this.enemyGroup = this.physics.add.group();
    this.coordinator = new SlotCoordinator();
    this.pathfinder = new Pathfinder(this.levelData.walls, MAP_WIDTH, MAP_HEIGHT);

    this.pathGraphics = this.add.graphics().setDepth(50);

    this.loadLevel(this.levelData);

    this.physics.add.collider(this.player, this.wallGroup);
    this.physics.add.collider(this.enemyGroup, this.wallGroup);
    this.physics.add.collider(this.enemyGroup, this.enemyGroup);

    this.physics.add.collider(this.playerBullets, this.wallGroup, (bullet) => {
      (bullet as Phaser.GameObjects.GameObject).destroy();
    });

    this.physics.add.collider(this.enemyBullets, this.wallGroup, (bullet) => {
      (bullet as Phaser.GameObjects.GameObject).destroy();
    });

    this.physics.add.overlap(this.enemyBullets, this.player, (_playerObj, bulletObj) => {
      const bullet = bulletObj as Bullet;
      const dmg = bullet.damage;
      bullet.destroy();
      this.player.takeDamage(dmg);
    });

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

    this.cameras.main.startFollow(this.player);
    this.cameras.main.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);

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

      const slot = enemy.getSlotPos(this.player);
      const cross = 8;
      this.pathGraphics.lineStyle(2, DEBUG_SLOT_COLOR, 0.9);
      this.pathGraphics.beginPath();
      this.pathGraphics.moveTo(slot.x - cross, slot.y);
      this.pathGraphics.lineTo(slot.x + cross, slot.y);
      this.pathGraphics.moveTo(slot.x, slot.y - cross);
      this.pathGraphics.lineTo(slot.x, slot.y + cross);
      this.pathGraphics.strokePath();
    }
  }

  private loadLevel(data: LevelData): void {
    for (const { x, y, w, h } of data.walls) {
      const rect = this.add.rectangle(x, y, w, h, WALL_COLOR);
      this.physics.add.existing(rect, true);
      this.wallGroup.add(rect);
    }

    this.player = new Player(this, data.playerStart.x, data.playerStart.y, this.playerBullets);

    for (const spawn of data.enemySpawns) {
      let enemy: MeleeEnemy | ShooterEnemy;
      if (spawn.type === "melee") {
        enemy = new MeleeEnemy(this, spawn.x, spawn.y);
      } else {
        enemy = new ShooterEnemy(this, spawn.x, spawn.y, this.enemyBullets, this.wallGroup);
      }
      enemy.setPathfinder(this.pathfinder);
      this.enemyGroup.add(enemy);
    }
    this.hasEnemies = data.enemySpawns.length > 0;
  }
}
