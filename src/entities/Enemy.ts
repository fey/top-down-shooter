import Phaser from "phaser";
import { Player } from "./Player";

export abstract class Enemy extends Phaser.Physics.Arcade.Sprite {
  hp: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    hp: number
  ) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.hp = hp;
  }

  takeDamage(amount: number): void {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.destroy();
    }
  }

  abstract tick(player: Player): void;
}
