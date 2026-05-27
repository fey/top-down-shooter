import Phaser from "phaser";
import {
  ENEMY_AGGRO_RANGE,
  MELEE_ATTACK_RANGE,
  MELEE_ENEMY_ATTACK_COOLDOWN,
  MELEE_ENEMY_DAMAGE,
  MELEE_ENEMY_HP,
  MELEE_ENEMY_SPEED,
  MELEE_SLOT_RADIUS,
} from "../config";
import { Enemy, EnemyState } from "./Enemy";
import type { Player } from "./Player";

export class MeleeEnemy extends Enemy {
  private lastAttackTime = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "enemy_melee", MELEE_ENEMY_HP);
    this.setTint(0xff4444);
    this.baseSpeed = MELEE_ENEMY_SPEED;
    this.flankRadius = MELEE_SLOT_RADIUS;
  }

  tick(player: Player): void {
    if (this.checkAndTriggerDodge(player)) return;

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    switch (this.state) {
      case EnemyState.IDLE:
        this.setVelocity(0, 0);
        if (dist < ENEMY_AGGRO_RANGE) {
          this.scene.events.emit("requestSlot", this);
          this.state = EnemyState.CHASE;
          this.scene.events.emit("packAlert", this.x, this.y);
        }
        break;

      case EnemyState.CHASE: {
        const target = this.getSlotPos(player);
        this.moveAlongPath(target, MELEE_ENEMY_SPEED);
        if (dist < MELEE_ATTACK_RANGE) this.state = EnemyState.ATTACK;
        break;
      }

      case EnemyState.ATTACK:
        this.setVelocity(0, 0);
        this.tryAttack(player);
        if (dist > MELEE_ATTACK_RANGE) this.state = EnemyState.CHASE;
        break;

      default:
        break;
    }
  }

  tryAttack(player: Player): void {
    const now = this.scene.time.now;
    if (now - this.lastAttackTime >= MELEE_ENEMY_ATTACK_COOLDOWN) {
      player.takeDamage(MELEE_ENEMY_DAMAGE);
      this.lastAttackTime = now;
    }
  }
}
