import Phaser from "phaser";
import {
  MELEE_ENEMY_ATTACK_COOLDOWN,
  MELEE_ENEMY_DAMAGE,
  MELEE_ENEMY_HP,
  MELEE_ENEMY_SPEED,
} from "../config";
import { Enemy } from "./Enemy";
import type { Player } from "./Player";

export class MeleeEnemy extends Enemy {
  private lastAttackTime = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "enemy_melee", MELEE_ENEMY_HP);
    this.setTint(0xff4444);
  }

  tick(player: Player): void {
    const angle = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    this.setVelocity(Math.cos(angle) * MELEE_ENEMY_SPEED, Math.sin(angle) * MELEE_ENEMY_SPEED);
  }

  tryAttack(player: Player): void {
    const now = this.scene.time.now;
    if (now - this.lastAttackTime >= MELEE_ENEMY_ATTACK_COOLDOWN) {
      player.takeDamage(MELEE_ENEMY_DAMAGE);
      this.lastAttackTime = now;
    }
  }
}
