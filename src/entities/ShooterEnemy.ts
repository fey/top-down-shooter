import Phaser from "phaser";
import { kiteAction } from "../ai/behaviors/combat";
import { chaseDecision } from "../ai/behaviors/navigation";
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
  SHOOTER_STRAFE_FLIP_MS,
  WAYPOINT_REACH_DIST,
} from "../config";
import type { WallDef } from "../types";
import { Bullet } from "./Bullet";
import { Enemy, EnemyState } from "./Enemy";
import type { Player } from "./Player";

export class ShooterEnemy extends Enemy {
  private lastFiredAt = 0;
  private readonly enemyBullets: Phaser.Physics.Arcade.Group;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    enemyBullets: Phaser.Physics.Arcade.Group,
    walls: WallDef[],
  ) {
    super(scene, x, y, "enemy_shooter", SHOOTER_ENEMY_HP);
    this.enemyBullets = enemyBullets;
    this.setWalls(walls);
  }

  tick(player: Player): void {
    this.faceTarget(player.x, player.y);
    this.refreshLoS(player);

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const now = this.scene.time.now;

    switch (this.state) {
      case EnemyState.IDLE:
        this.setVelocity(0, 0);
        if (dist < ENEMY_AGGRO_RANGE && this.losCache) {
          this.state = EnemyState.CHASE;
          this.scene.events.emit("packAlert", this.x, this.y);
        }
        break;

      case EnemyState.CHASE: {
        const nav = chaseDecision(this.losCache, this.prevLosCache, this.hasLastKnown);
        // Агро тревогой ставит CHASE, но точки не даёт — иначе поиск ушёл бы в (0, 0).
        if (nav.adoptPlayerAsLastKnown) this.rememberLastKnown(player.x, player.y);
        if (nav.repath) this.invalidatePath();

        if (nav.target === "lastKnown") {
          // Игрока не видно — дальше ведёт SEARCH: он и есть «идти к последней известной
          // точке и сдаться по прибытии». Идти на живого игрока здесь нельзя: агро от
          // выстрела из-за угла дало бы стрелку знание, которого у него нет.
          this.state = EnemyState.SEARCH;
          break;
        }

        // Видимость есть — идти к игроку по A* (pathfinding сам обогнёт стену),
        // пока не выйдем на дистанцию выстрела
        this.moveAlongPath(new Phaser.Math.Vector2(player.x, player.y), SHOOTER_ENEMY_SPEED);
        if (dist <= SHOOTER_RANGE) {
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
        switch (kiteAction(dist, SHOOTER_KITE_RETREAT_DIST, SHOOTER_KITE_ADVANCE_DIST)) {
          case "retreat":
            // игрок слишком близко — отступать по прямой от него, продолжая стрелять
            this.retreatFrom(player, SHOOTER_ENEMY_SPEED);
            break;
          case "advance":
            // игрок слишком далеко — сблизиться через pathfinding (обходит стены)
            this.moveAlongPath(new Phaser.Math.Vector2(player.x, player.y), SHOOTER_ENEMY_SPEED);
            break;
          case "strafe":
            // непрерывное боковое движение
            this.applyStrafe(player, SHOOTER_ENEMY_SPEED, SHOOTER_STRAFE_FLIP_MS, now);
            break;
        }
        // LoS гарантирован проверкой выше — стреляем без доп. проверки
        if (now - this.lastFiredAt >= SHOOTER_ENEMY_FIRE_COOLDOWN) {
          this.spawnBullet(Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y));
          this.lastFiredAt = now;
        }
        if (dist > SHOOTER_RANGE) this.state = EnemyState.CHASE;
        break;
      }

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

  private spawnBullet(angle: number): void {
    const bullet = new Bullet(this.scene, this.x, this.y, SHOOTER_ENEMY_DAMAGE);
    this.enemyBullets.add(bullet);
    bullet.setVelocity(
      Math.cos(angle) * SHOOTER_BULLET_SPEED,
      Math.sin(angle) * SHOOTER_BULLET_SPEED,
    );
  }
}
