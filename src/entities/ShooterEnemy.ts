import Phaser from "phaser";
import {
  SHOOTER_BULLET_SPEED,
  SHOOTER_ENEMY_DAMAGE,
  SHOOTER_ENEMY_FIRE_COOLDOWN,
  SHOOTER_ENEMY_HP,
  SHOOTER_ENEMY_SPEED,
  SHOOTER_RANGE,
} from "../config";
import { Bullet } from "./Bullet";
import { Enemy } from "./Enemy";
import type { Player } from "./Player";

export class ShooterEnemy extends Enemy {
  private lastFiredAt = 0;
  private readonly enemyBullets: Phaser.Physics.Arcade.Group;
  private readonly wallGroup: Phaser.Physics.Arcade.StaticGroup;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    enemyBullets: Phaser.Physics.Arcade.Group,
    wallGroup: Phaser.Physics.Arcade.StaticGroup,
  ) {
    super(scene, x, y, "enemy_shooter", SHOOTER_ENEMY_HP);
    this.setTint(0x4444ff);
    this.enemyBullets = enemyBullets;
    this.wallGroup = wallGroup;
  }

  tick(player: Player): void {
    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    if (dist > SHOOTER_RANGE) {
      const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
      this.setVelocity(
        Math.cos(angle) * SHOOTER_ENEMY_SPEED,
        Math.sin(angle) * SHOOTER_ENEMY_SPEED,
      );
    } else {
      this.setVelocity(0, 0);
    }

    const now = this.scene.time.now;
    if (now - this.lastFiredAt >= SHOOTER_ENEMY_FIRE_COOLDOWN && this.hasLoS(player)) {
      const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
      this.spawnBullet(angle);
      this.lastFiredAt = now;
    }
  }

  private hasLoS(player: Player): boolean {
    const line = new Phaser.Geom.Line(this.x, this.y, player.x, player.y);
    for (const wall of this.wallGroup.getChildren()) {
      const bounds = (
        wall as Phaser.GameObjects.Components.Size &
          Phaser.GameObjects.GameObject & { getBounds(): Phaser.Geom.Rectangle }
      ).getBounds();
      if (Phaser.Geom.Intersects.LineToRectangle(line, bounds)) return false;
    }
    return true;
  }

  private spawnBullet(angle: number): void {
    const bullet = new Bullet(this.scene, this.x, this.y);
    this.enemyBullets.add(bullet);
    bullet.damage = SHOOTER_ENEMY_DAMAGE;
    bullet.setVelocity(
      Math.cos(angle) * SHOOTER_BULLET_SPEED,
      Math.sin(angle) * SHOOTER_BULLET_SPEED,
    );
  }
}
