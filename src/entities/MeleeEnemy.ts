import Phaser from "phaser";
import {
  ENEMY_AGGRO_RANGE,
  MELEE_ATTACK_RANGE,
  MELEE_ENEMY_ATTACK_COOLDOWN,
  MELEE_ENEMY_DAMAGE,
  MELEE_ENEMY_HP,
  MELEE_ENEMY_SPEED,
  MELEE_SEARCH_TIMEOUT,
  WAYPOINT_REACH_DIST,
} from "../config";
import { emitGameEvent, PACK_ALERT } from "../events";
import type { WallDef } from "../types";
import { Enemy, EnemyState } from "./Enemy";
import type { Player } from "./Player";

export class MeleeEnemy extends Enemy {
  private lastAttackTime = 0;
  private searchEnteredTime = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, walls: WallDef[]) {
    super(scene, x, y, "enemy_melee", MELEE_ENEMY_HP);
    this.setWalls(walls);
  }

  tick(player: Player): void {
    this.faceTarget(player.x, player.y);
    this.refreshLoS(player);

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    switch (this.state) {
      case EnemyState.IDLE:
        this.setVelocity(0, 0);
        if (dist < ENEMY_AGGRO_RANGE && this.losCache) {
          this.state = EnemyState.CHASE;
          emitGameEvent(this.scene.events, PACK_ALERT, this.x, this.y);
        }
        break;

      case EnemyState.CHASE: {
        if (this.chaseTarget(player) === "player") {
          this.navigateTo("player", player, MELEE_ENEMY_SPEED);
          if (dist < MELEE_ATTACK_RANGE) this.state = EnemyState.ATTACK;
        } else {
          this.navigateTo("lastKnown", this.lastKnownPos, MELEE_ENEMY_SPEED);
          // Переходим в SEARCH только когда физически добрались до lastKnownPos
          const distToLkp = Phaser.Math.Distance.BetweenPoints(this, this.lastKnownPos);
          if (distToLkp < WAYPOINT_REACH_DIST) {
            this.searchEnteredTime = this.scene.time.now;
            this.state = EnemyState.SEARCH;
          }
        }
        break;
      }

      case EnemyState.SEARCH: {
        // Добрались до lastKnownPos, но игрока не видим — ждём и смотрим
        if (this.losCache) {
          this.state = EnemyState.CHASE;
          break;
        }
        this.setVelocity(0, 0);
        if (this.scene.time.now - this.searchEnteredTime >= MELEE_SEARCH_TIMEOUT) {
          this.state = EnemyState.IDLE;
        }
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
