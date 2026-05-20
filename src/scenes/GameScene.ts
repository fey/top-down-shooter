import Phaser from "phaser";
import { MAP_HEIGHT, MAP_WIDTH } from "../config";
import { DebugOverlay } from "../debug/DebugOverlay";
import { Bullet } from "../entities/Bullet";
import type { Enemy } from "../entities/Enemy";
import { MeleeEnemy } from "../entities/MeleeEnemy";
import { Player } from "../entities/Player";

const WALL_COLOR = 0x555566;

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private wallGroup!: Phaser.Physics.Arcade.StaticGroup;
  playerBullets!: Phaser.Physics.Arcade.Group;
  enemyGroup!: Phaser.Physics.Arcade.Group;

  constructor() {
    super("Game");
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#1a1a1a");
    this.physics.world.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);

    this.wallGroup = this.physics.add.staticGroup();
    this.createWalls();

    this.playerBullets = this.physics.add.group({
      classType: Bullet,
      runChildUpdate: true,
    });

    this.enemyGroup = this.physics.add.group();

    this.player = new Player(this, 200, 200, this.playerBullets);

    this.spawnEnemies();

    this.physics.add.collider(this.player, this.wallGroup);
    this.physics.add.collider(this.enemyGroup, this.wallGroup);
    this.physics.add.collider(this.enemyGroup, this.enemyGroup);

    this.physics.add.collider(this.playerBullets, this.wallGroup, (bullet) => {
      (bullet as Phaser.GameObjects.GameObject).destroy();
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

    new DebugOverlay(this, this.player, this.enemyGroup);
  }

  override update(): void {
    this.player.update();

    for (const enemy of this.enemyGroup.getChildren()) {
      (enemy as MeleeEnemy).tick(this.player);
    }
  }

  private spawnEnemies(): void {
    const spawns: Array<[number, number]> = [
      [600, 300],
      [1000, 500],
      [800, 800],
      [1400, 600],
    ];
    for (const [x, y] of spawns) {
      this.enemyGroup.add(new MeleeEnemy(this, x, y));
    }
  }

  private createWalls(): void {
    const walls: Array<[number, number, number, number]> = [
      // outer border segments (top, bottom, left, right)
      [MAP_WIDTH / 2, 16, MAP_WIDTH, 32],
      [MAP_WIDTH / 2, MAP_HEIGHT - 16, MAP_WIDTH, 32],
      [16, MAP_HEIGHT / 2, 32, MAP_HEIGHT],
      [MAP_WIDTH - 16, MAP_HEIGHT / 2, 32, MAP_HEIGHT],
      // interior walls for room division
      [600, 400, 200, 32],
      [900, 700, 32, 300],
      [400, 800, 400, 32],
      [1400, 300, 32, 400],
      [1200, 900, 300, 32],
    ];

    for (const [x, y, w, h] of walls) {
      const rect = this.add.rectangle(x, y, w, h, WALL_COLOR);
      this.physics.add.existing(rect, true);
      this.wallGroup.add(rect);
    }
  }
}
