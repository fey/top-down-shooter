import Phaser from "phaser";
import {
  ENEMY_AGGRO_RANGE,
  MELEE_ATTACK_RANGE,
  MELEE_ENEMY_ATTACK_COOLDOWN,
  MELEE_ENEMY_DAMAGE,
  MELEE_ENEMY_HP,
  MELEE_ENEMY_SPEED,
  MELEE_SEARCH_TIMEOUT,
  MELEE_SLOT_RADIUS,
  WAYPOINT_REACH_DIST,
} from "../config";
import { Enemy, EnemyState } from "./Enemy";
import type { Player } from "./Player";

export class MeleeEnemy extends Enemy {
  private lastAttackTime = 0;
  private losCache = false;
  private prevLosCache = false;
  private searchEnteredTime = 0;
  private readonly lastKnownPos = new Phaser.Math.Vector2(-9999, -9999);

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    wallGroup: Phaser.Physics.Arcade.StaticGroup,
  ) {
    super(scene, x, y, "enemy_melee", MELEE_ENEMY_HP);
    this.setTint(0xff4444);
    this.baseSpeed = MELEE_ENEMY_SPEED;
    this.flankRadius = MELEE_SLOT_RADIUS;
    this.setWallGroup(wallGroup);
  }

  tick(player: Player): void {
    this.prevLosCache = this.losCache;
    this.losCache = this.hasLoS(player);
    if (this.losCache) {
      this.lastKnownPos.set(player.x, player.y);
    }
    if (this.checkAndTriggerDodge(player)) return;

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    switch (this.state) {
      case EnemyState.IDLE:
        this.setVelocity(0, 0);
        if (dist < ENEMY_AGGRO_RANGE && this.losCache) {
          this.scene.events.emit("requestSlot", this);
          this.state = EnemyState.CHASE;
          this.scene.events.emit("packAlert", this.x, this.y);
        }
        break;

      case EnemyState.CHASE: {
        if (this.losCache) {
          // Есть прямая видимость — идём к слоту (флангирующая позиция)
          this.moveAlongPath(this.getSlotPos(player), MELEE_ENEMY_SPEED);
          if (dist < MELEE_ATTACK_RANGE) this.state = EnemyState.ATTACK;
        } else {
          // LoS потерян — идём к последней известной позиции игрока
          if (this.lastKnownPos.x === -9999) {
            // Агро пришло через packAlert — брать текущую позицию как fallback
            this.lastKnownPos.set(player.x, player.y);
          }
          // При только что потерянном LoS — принудительно пересчитать путь,
          // чтобы не использовать устаревший маршрут к слоту
          if (this.prevLosCache) {
            this.invalidatePath();
          }
          this.moveAlongPath(this.lastKnownPos, MELEE_ENEMY_SPEED);
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

  protected override canDodge(_player: Player): boolean {
    return this.losCache;
  }

  tryAttack(player: Player): void {
    const now = this.scene.time.now;
    if (now - this.lastAttackTime >= MELEE_ENEMY_ATTACK_COOLDOWN) {
      player.takeDamage(MELEE_ENEMY_DAMAGE);
      this.lastAttackTime = now;
    }
  }
}
