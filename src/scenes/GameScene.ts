import Phaser from "phaser";
import { MAP_HEIGHT, MAP_WIDTH } from "../config";
import { Player } from "../entities/Player";

const WALL_COLOR = 0x555566;

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private wallGroup!: Phaser.Physics.Arcade.StaticGroup;

  constructor() {
    super("Game");
  }

  create(): void {
    this.cameras.main.setBackgroundColor("#1a1a1a");
    this.physics.world.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);

    this.wallGroup = this.physics.add.staticGroup();
    this.createWalls();

    this.player = new Player(this, 200, 200);
    this.physics.add.collider(this.player, this.wallGroup);

    this.cameras.main.startFollow(this.player);
    this.cameras.main.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);
  }

  override update(): void {
    this.player.update();
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
