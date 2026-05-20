import Phaser from "phaser";
import { BULLET_DAMAGE, BULLET_TTL } from "../config";

export class Bullet extends Phaser.Physics.Arcade.Sprite {
  damage = BULLET_DAMAGE;
  private ttlTimer: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "bullet");
    scene.add.existing(this);
    this.ttlTimer = scene.time.addEvent({
      delay: BULLET_TTL,
      callback: () => {
        if (this.active) this.destroy();
      },
    });
  }

  override destroy(fromScene?: boolean): void {
    this.ttlTimer?.remove(false);
    super.destroy(fromScene);
  }
}
