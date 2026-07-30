import type Phaser from "phaser";
import type { WeaponDef } from "../config";
import { Bullet } from "../entities/Bullet";
import { canFire } from "./cooldown";
import { computePelletAngles } from "./pellets";

/**
 * Оружие, управляемое дескриптором (`WEAPONS` в config.ts): кулдаун, скорость пули и
 * веер дробинок — данные, а не подклассы. Стрелок (игрок, SmartBot) владеет экземпляром
 * и передаёт группу пуль в `tryFire` — само оружие про сцену ничего не знает.
 */
export class Weapon {
  readonly def: WeaponDef;
  private lastFired = 0;

  constructor(def: WeaponDef) {
    this.def = def;
  }

  tryFire(
    bulletGroup: Phaser.Physics.Arcade.Group,
    x: number,
    y: number,
    angle: number,
    now: number,
  ): void {
    if (!canFire(now, this.lastFired, this.def.cooldown)) return;
    this.lastFired = now;
    this.spawnBullets(bulletGroup, x, y, angle);
  }

  private spawnBullets(
    bulletGroup: Phaser.Physics.Arcade.Group,
    x: number,
    y: number,
    angle: number,
  ): void {
    const { pelletCount, spreadRad, bulletSpeed } = this.def;
    for (const a of computePelletAngles(angle, pelletCount, spreadRad)) {
      const bullet = new Bullet(bulletGroup.scene, x, y);
      bulletGroup.add(bullet);
      bullet.setVelocity(Math.cos(a) * bulletSpeed, Math.sin(a) * bulletSpeed);
    }
  }
}
