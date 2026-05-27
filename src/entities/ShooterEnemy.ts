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
} from "../config";
import { Bullet } from "./Bullet";
import { Enemy, EnemyState } from "./Enemy";
import type { Player } from "./Player";

export class ShooterEnemy extends Enemy {
  private lastFiredAt = 0;
  private readonly enemyBullets: Phaser.Physics.Arcade.Group;
  private readonly wallGroup: Phaser.Physics.Arcade.StaticGroup;
  private strafeSign = 1;
  private strafeFlipTime = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    enemyBullets: Phaser.Physics.Arcade.Group,
    wallGroup: Phaser.Physics.Arcade.StaticGroup,
  ) {
    super(scene, x, y, "enemy_shooter", SHOOTER_ENEMY_HP);
    this.setTint(0x4444ff);
    this.baseSpeed = SHOOTER_ENEMY_SPEED;
    this.flankRadius = SHOOTER_RANGE;
    this.enemyBullets = enemyBullets;
    this.wallGroup = wallGroup;
  }

  tick(player: Player): void {
    // FUTURE: re-enable dodge when polished
    // if (this.checkAndTriggerDodge(player)) return;

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const now = this.scene.time.now;

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
        this.moveAlongPath(target, SHOOTER_ENEMY_SPEED);
        if (dist <= SHOOTER_RANGE) {
          if (this.hasLoS(player)) {
            this.state = EnemyState.SHOOT;
          } else {
            // FUTURE: re-enable strafe when polished
            // this.enterStrafe(now);
          }
        }
        break;
      }

      case EnemyState.SHOOT: {
        // кайтинг: держать дистанцию SHOOTER_RANGE ± буфер
        if (dist < SHOOTER_KITE_RETREAT_DIST) {
          // игрок слишком близко — запросить новый слот и перепозиционироваться
          this.scene.events.emit("requestSlot", this);
          this.state = EnemyState.CHASE;
        } else if (dist > SHOOTER_KITE_ADVANCE_DIST) {
          // игрок слишком далеко — сблизиться через pathfinding (обходит стены)
          this.moveAlongPath(this.getSlotPos(player), SHOOTER_ENEMY_SPEED);
        } else {
          this.setVelocity(0, 0);
        }
        // стрельба не зависит от движения
        if (now - this.lastFiredAt >= SHOOTER_ENEMY_FIRE_COOLDOWN && this.hasLoS(player)) {
          this.spawnBullet(Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y));
          this.lastFiredAt = now;
        }
        // FUTURE: re-enable strafe when polished
        // if (!this.hasLoS(player)) this.enterStrafe(now);
        if (!this.hasLoS(player)) this.state = EnemyState.CHASE;
        if (dist > SHOOTER_RANGE) this.state = EnemyState.CHASE;
        break;
      }

      // FUTURE: re-enable strafe state when polished
      // case EnemyState.STRAFE:
      //   this.applyStrafe(player, now);
      //   if (this.hasLoS(player)) this.state = EnemyState.SHOOT;
      //   if (dist > SHOOTER_RANGE) this.state = EnemyState.CHASE;
      //   break;

      default:
        break;
    }
  }

  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: FUTURE re-enable strafe
  private enterStrafe(now: number): void {
    this.state = EnemyState.STRAFE;
    this.strafeSign = Math.random() < 0.5 ? 1 : -1;
    this.strafeFlipTime = now + 1000;
  }

  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: FUTURE re-enable strafe
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
