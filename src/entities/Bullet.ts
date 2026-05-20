import Phaser from "phaser";
import { BULLET_TTL } from "../config";

export class Bullet extends Phaser.Physics.Arcade.Sprite {
  damage = 1;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "bullet");
    scene.add.existing(this);
    scene.time.addEvent({
      delay: BULLET_TTL,
      callback: () => {
        if (this.active) this.destroy();
      },
    });
  }
}
