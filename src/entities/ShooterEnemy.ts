import Phaser from "phaser";
import {
  ENEMY_AGGRO_RANGE,
  SHOOTER_BULLET_SPEED,
  SHOOTER_ENEMY_DAMAGE,
  SHOOTER_ENEMY_FIRE_COOLDOWN,
  SHOOTER_ENEMY_HP,
  SHOOTER_ENEMY_SPEED,
  SHOOTER_KITE_ADVANCE_DIST,
  SHOOTER_KITE_RETREAT_DIST,
  SHOOTER_RANGE,
  WAYPOINT_REACH_DIST,
} from "../config";
import type { WallDef } from "../types";
import { Bullet } from "./Bullet";
import { Enemy, EnemyState } from "./Enemy";
import type { Player } from "./Player";

export class ShooterEnemy extends Enemy {
  private lastFiredAt = 0;
  private readonly enemyBullets: Phaser.Physics.Arcade.Group;
  private strafeSign = 1;
  private strafeFlipTime = 0;
  private readonly lastKnownPos = new Phaser.Math.Vector2(-9999, -9999);
  private losCache = false; // refreshed at the top of every tick()

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    enemyBullets: Phaser.Physics.Arcade.Group,
    walls: WallDef[],
  ) {
    super(scene, x, y, "enemy_shooter", SHOOTER_ENEMY_HP);
    this.baseSpeed = SHOOTER_ENEMY_SPEED;
    this.flankRadius = SHOOTER_RANGE;
    this.enemyBullets = enemyBullets;
    this.setWalls(walls);
  }

  tick(player: Player): void {
    this.setRotation(Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y));
    this.losCache = this.hasLoS(player);
    if (this.losCache) {
      this.lastKnownPos.set(player.x, player.y);
    }
    if (this.checkAndTriggerDodge(player)) return;

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const now = this.scene.time.now;

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
        // Без LoS — идти прямо к игроку (pathfinding обогнёт стену)
        // С LoS — идти к слот-позиции (правильная дистанция для стрельбы)
        const target = this.losCache
          ? this.getSlotPos(player)
          : new Phaser.Math.Vector2(player.x, player.y);
        this.moveAlongPath(target, SHOOTER_ENEMY_SPEED);
        if (dist <= SHOOTER_RANGE && this.losCache) {
          this.state = EnemyState.SHOOT;
        }
        break;
      }

      case EnemyState.SHOOT: {
        // нет LoS — сразу уходим в поиск, движение не применяем
        if (!this.losCache) {
          this.state = EnemyState.SEARCH;
          break;
        }
        // кайтинг: держать дистанцию SHOOTER_RANGE ± буфер
        if (dist < SHOOTER_KITE_RETREAT_DIST) {
          // игрок слишком близко — запросить новый слот и перепозиционироваться
          this.scene.events.emit("requestSlot", this);
          this.state = EnemyState.CHASE;
        } else if (dist > SHOOTER_KITE_ADVANCE_DIST) {
          // игрок слишком далеко — сблизиться через pathfinding (обходит стены)
          this.moveAlongPath(this.getSlotPos(player), SHOOTER_ENEMY_SPEED);
        } else {
          this.applyStrafe(player, now); // непрерывное боковое движение
        }
        // LoS гарантирован проверкой выше — стреляем без доп. проверки
        if (now - this.lastFiredAt >= SHOOTER_ENEMY_FIRE_COOLDOWN) {
          this.spawnBullet(Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y));
          this.lastFiredAt = now;
        }
        if (dist > SHOOTER_RANGE) this.state = EnemyState.CHASE;
        break;
      }

      // FUTURE: re-enable strafe state when polished
      // case EnemyState.STRAFE:
      //   this.applyStrafe(player, now);
      //   if (this.hasLoS(player)) this.state = EnemyState.SHOOT;
      //   if (dist > SHOOTER_RANGE) this.state = EnemyState.CHASE;
      //   break;

      case EnemyState.SEARCH: {
        if (this.losCache) {
          this.state = EnemyState.CHASE;
          break;
        }
        this.moveAlongPath(this.lastKnownPos, SHOOTER_ENEMY_SPEED);
        const distToLkp = Phaser.Math.Distance.BetweenPoints(this, this.lastKnownPos);
        if (distToLkp < WAYPOINT_REACH_DIST) {
          this.setVelocity(0, 0);
          this.state = EnemyState.IDLE;
        }
        break;
      }

      default:
        break;
    }
  }

  protected override canDodge(_player: Player): boolean {
    // LoS already computed in tick(); player arg not needed here
    return this.losCache;
  }

  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: FUTURE re-enable strafe
  private enterStrafe(now: number): void {
    this.state = EnemyState.STRAFE;
    this.strafeSign = Math.random() < 0.5 ? 1 : -1;
    this.strafeFlipTime = now + 1000;
  }

  private applyStrafe(player: Player, now: number): void {
    if (now >= this.strafeFlipTime) {
      this.strafeSign *= -1;
      this.strafeFlipTime = now + 1000;
    }
    const angleToPlayer = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    const perpAngle = angleToPlayer + this.strafeSign * (Math.PI / 2);
    this.setVelocity(
      Math.cos(perpAngle) * SHOOTER_ENEMY_SPEED,
      Math.sin(perpAngle) * SHOOTER_ENEMY_SPEED,
    );
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
