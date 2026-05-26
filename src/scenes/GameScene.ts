import Phaser from "phaser";
import { MAP_HEIGHT, MAP_WIDTH } from "../config";
import { DebugOverlay } from "../debug/DebugOverlay";
import { Bullet } from "../entities/Bullet";
import type { Enemy } from "../entities/Enemy";
import { MeleeEnemy } from "../entities/MeleeEnemy";
import { Player } from "../entities/Player";
import { ShooterEnemy } from "../entities/ShooterEnemy";
import type { LevelData } from "../level/level1";
import { level1 } from "../level/level1";
import { GAME_OVER_SCENE_KEY } from "./GameOverScene";

const WALL_COLOR = 0x555566;

export const GAME_SCENE_KEY = "Game";

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private wallGroup!: Phaser.Physics.Arcade.StaticGroup;
  private playerBullets!: Phaser.Physics.Arcade.Group;
  private enemyBullets!: Phaser.Physics.Arcade.Group;
  private enemyGroup!: Phaser.Physics.Arcade.Group;
  private gameOver = false;

  constructor() {
    super(GAME_SCENE_KEY);
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#1a1a1a");
    this.physics.world.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);

    this.wallGroup = this.physics.add.staticGroup();
    this.playerBullets = this.physics.add.group({ classType: Bullet, runChildUpdate: true });
    this.enemyBullets = this.physics.add.group({ classType: Bullet, runChildUpdate: true });
    this.enemyGroup = this.physics.add.group();

    this.loadLevel(level1);

    this.physics.add.collider(this.player, this.wallGroup);
    this.physics.add.collider(this.enemyGroup, this.wallGroup);
    this.physics.add.collider(this.enemyGroup, this.enemyGroup);

    this.physics.add.collider(this.playerBullets, this.wallGroup, (bullet) => {
      (bullet as Phaser.GameObjects.GameObject).destroy();
    });

    this.physics.add.collider(this.enemyBullets, this.wallGroup, (bullet) => {
      (bullet as Phaser.GameObjects.GameObject).destroy();
    });

    this.physics.add.overlap(this.enemyBullets, this.player, (bulletObj) => {
      const bullet = bulletObj as Bullet;
      bullet.destroy();
      this.player.takeDamage(bullet.damage);
    });

    this.physics.add.overlap(
      this.player,
      this.enemyGroup,
      (_playerObj, enemyObj) => {
        (enemyObj as MeleeEnemy).tryAttack(this.player);
      },
      undefined,
      this,
    );

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

    this.cameras.main.startFollow(this.player);
    this.cameras.main.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);

    this.events.once("playerDied", () => {
      this.gameOver = true;
      this.scene.start(GAME_OVER_SCENE_KEY, { win: false });
    });

    new DebugOverlay(this, this.player, this.enemyGroup);
  }

  override update(): void {
    if (this.gameOver) return;

    if (this.player.active) this.player.update();

    for (const enemy of this.enemyGroup.getChildren()) {
      if (enemy.active) (enemy as Enemy).tick(this.player);
    }

    if (this.enemyGroup.countActive(true) === 0) {
      this.gameOver = true;
      this.scene.start(GAME_OVER_SCENE_KEY, { win: true });
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
      if (spawn.type === "melee") {
        this.enemyGroup.add(new MeleeEnemy(this, spawn.x, spawn.y));
      } else if (spawn.type === "shooter") {
        this.enemyGroup.add(
          new ShooterEnemy(this, spawn.x, spawn.y, this.enemyBullets, this.wallGroup),
        );
      }
    }
  }
}
