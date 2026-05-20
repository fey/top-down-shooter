import Phaser from "phaser";
import { BULLET_TTL } from "../config";

export class Bullet extends Phaser.Physics.Arcade.Sprite {
  damage: number;

  constructor(scene: Phaser.Scene, x: number, y: number, vx: number, vy: number, damage = 1) {
    super(scene, x, y, "bullet");
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.damage = damage;
    this.setVelocity(vx, vy);
    scene.time.addEvent({
      delay: BULLET_TTL,
      callback: () => {
        if (this.active) this.destroy();
      },
    });
  }
}
