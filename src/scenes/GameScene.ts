import Phaser from "phaser";
import type { Pathfinder } from "../ai/Pathfinder";
import { COLOR_BG_GAME, PACK_ALERT_RADIUS } from "../config";
import { DebugOverlay } from "../debug/DebugOverlay";
import { drawPathGrid } from "../debug/grid";
import { drawDebugPaths } from "../debug/paths";
import { Bullet } from "../entities/Bullet";
import { type Enemy, EnemyState } from "../entities/Enemy";
import type { Player } from "../entities/Player";
import { loadTiledLevel } from "../level/LevelLoader";
import type { LevelConfig } from "../level/levels";
import { GAME_OVER_SCENE_KEY } from "./GameOverScene";
import { LEVEL_SELECT_SCENE_KEY } from "./LevelSelectScene";

export const GAME_SCENE_KEY = "Game";
export type { LevelConfig };

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private playerBullets!: Phaser.Physics.Arcade.Group;
  private enemyBullets!: Phaser.Physics.Arcade.Group;
  private enemyGroup!: Phaser.Physics.Arcade.Group;
  private pathfinder!: Pathfinder;
  private pathGraphics!: Phaser.GameObjects.Graphics;
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private debugPaths = false;
  private gameOver = false;
  private hasEnemies = false;
  private levelConfig: LevelConfig = { key: "level1-map" };

  constructor() {
    super(GAME_SCENE_KEY);
  }

  init(data: { level?: LevelConfig }): void {
    this.levelConfig = data.level ?? { key: "level1-map" };
    this.gameOver = false;
    this.hasEnemies = false;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLOR_BG_GAME);

    this.playerBullets = this.physics.add.group({ classType: Bullet, runChildUpdate: true });
    this.enemyBullets = this.physics.add.group({ classType: Bullet, runChildUpdate: true });
    this.enemyGroup = this.physics.add.group();
    this.pathGraphics = this.add.graphics().setDepth(50);

    // Загрузка уровня: создаёт игрока, врагов и pathfinder; коллизии/камеру вешаем здесь
    const level = loadTiledLevel(this, this.levelConfig.key, {
      playerBullets: this.playerBullets,
      enemyBullets: this.enemyBullets,
      enemyGroup: this.enemyGroup,
    });
    this.player = level.player;
    this.pathfinder = level.pathfinder;
    this.hasEnemies = this.enemyGroup.getLength() > 0;

    // Статичная дебаг-сетка pathfinding: рисуется один раз, видимость — по F1
    this.gridGraphics = this.add.graphics().setDepth(40).setVisible(false);
    drawPathGrid(this.gridGraphics, this.pathfinder, level.mapW, level.mapH);

    this.setupCollisions(level.wallLayer);

    this.events.on("packAlert", (x: number, y: number) => {
      for (const obj of this.enemyGroup.getChildren()) {
        const e = obj as Enemy;
        if (e.state === EnemyState.IDLE) {
          const d = Phaser.Math.Distance.Between(x, y, e.x, e.y);
          if (d < PACK_ALERT_RADIUS) {
            e.state = EnemyState.CHASE;
          }
        }
      }
    });

    this.cameras.main.startFollow(this.player);
    this.cameras.main.setBounds(0, 0, level.mapW, level.mapH);

    this.events.once("playerDied", () => {
      this.gameOver = true;
      this.scene.start(GAME_OVER_SCENE_KEY, { win: false });
    });

    this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).once("down", () => {
      this.scene.start(LEVEL_SELECT_SCENE_KEY);
    });

    this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.F1).on("down", () => {
      this.debugPaths = !this.debugPaths;
      this.gridGraphics.setVisible(this.debugPaths);
      if (!this.debugPaths) this.pathGraphics.clear();
    });

    new DebugOverlay(this, this.player, this.enemyGroup);
  }

  /** Навешивает все коллизии: враг↔враг, пули↔цели, всё↔стены (если стены есть). */
  private setupCollisions(wallLayer: Phaser.Tilemaps.TilemapLayer | null): void {
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

    if (!wallLayer) return;
    this.physics.add.collider(this.player, wallLayer);
    this.physics.add.collider(this.enemyGroup, wallLayer);
    this.physics.add.collider(this.playerBullets, wallLayer, (bullet) => {
      (bullet as Phaser.GameObjects.GameObject).destroy();
    });
    this.physics.add.collider(this.enemyBullets, wallLayer, (bullet) => {
      (bullet as Phaser.GameObjects.GameObject).destroy();
    });
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

    if (this.debugPaths) {
      drawDebugPaths(
        this.pathGraphics,
        this.enemyGroup.getChildren().map((obj) => obj as Enemy),
        this.player,
      );
    }
  }
}
