import type Phaser from "phaser";
import { BULLET_SPEED, PISTOL_COOLDOWN } from "../config";
import { Bullet } from "../entities/Bullet";
import { Weapon } from "./Weapon";

export class Pistol extends Weapon {
  constructor() {
    super(PISTOL_COOLDOWN, BULLET_SPEED);
  }

  protected spawnBullets(
    bulletGroup: Phaser.Physics.Arcade.Group,
    x: number,
    y: number,
    angle: number,
  ): void {
    const vx = Math.cos(angle) * this.bulletSpeed;
    const vy = Math.sin(angle) * this.bulletSpeed;
    const bullet = new Bullet(bulletGroup.scene, x, y, vx, vy);
    bulletGroup.add(bullet);
  }
}
