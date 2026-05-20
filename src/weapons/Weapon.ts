import type Phaser from "phaser";

export abstract class Weapon {
  protected readonly cooldown: number;
  protected readonly bulletSpeed: number;
  private lastFired = 0;

  constructor(cooldown: number, bulletSpeed: number) {
    this.cooldown = cooldown;
    this.bulletSpeed = bulletSpeed;
  }

  tryFire(
    bulletGroup: Phaser.Physics.Arcade.Group,
    x: number,
    y: number,
    angle: number,
    now: number,
  ): void {
    if (now - this.lastFired < this.cooldown) return;
    this.lastFired = now;
    this.spawnBullets(bulletGroup, x, y, angle);
  }

  protected abstract spawnBullets(
    bulletGroup: Phaser.Physics.Arcade.Group,
    x: number,
    y: number,
    angle: number,
  ): void;
}
