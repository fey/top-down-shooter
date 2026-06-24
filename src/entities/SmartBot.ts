import Phaser from "phaser";
import {
  BULLET_SPEED,
  ENEMY_BODY_RADIUS,
  SMART_BOT_AGGRO_RANGE,
  SMART_BOT_AIM_SPREAD,
  SMART_BOT_COMBAT_RANGE,
  SMART_BOT_DODGE_DURATION,
  SMART_BOT_DODGE_RADIUS,
  SMART_BOT_HP,
  SMART_BOT_KITE_ADVANCE_DIST,
  SMART_BOT_KITE_RETREAT_DIST,
  SMART_BOT_LOW_HP,
  SMART_BOT_REACTION_MS,
  SMART_BOT_RETREAT_COOLDOWN_MS,
  SMART_BOT_RETREAT_MS,
  SMART_BOT_SPEED,
  SMART_BOT_STRAFE_FLIP_MS,
  WAYPOINT_REACH_DIST,
} from "../config";
import type { WallDef } from "../types";
import { Pistol } from "../weapons/Pistol";
import type { Weapon } from "../weapons/Weapon";
import type { Bullet } from "./Bullet";
import { Enemy, EnemyState } from "./Enemy";
import type { Player } from "./Player";

/** Боковой зазор, при котором летящая пуля считается угрозой (≈ диаметр тела бота). */
const DODGE_LATERAL_THRESHOLD = ENEMY_BODY_RADIUS * 1.8;

/**
 * Умный бот — соперник уровня игрока (то же HP/скорость/оружие), но с продвинутым ИИ
 * в духе ботов Quake 3: упреждающий прицел с моделью точности/реакции, уклонение от пуль,
 * тактика укрытий при низком HP и боевое маневрирование (circle-strafe).
 * Стреляет тем же `Pistol`, что и игрок, в группу `enemyBullets`; отслеживает `playerBullets`
 * для уклонения. Переиспользует навигацию и LoS базового класса `Enemy`.
 */
export class SmartBot extends Enemy {
  private readonly enemyBullets: Phaser.Physics.Arcade.Group;
  private readonly playerBullets: Phaser.Physics.Arcade.Group;
  private readonly weapon: Weapon;

  private readonly lastKnownPos = new Phaser.Math.Vector2(-9999, -9999);
  private prevLos = false;
  private losAcquiredAt = 0;

  private strafeSign = 1;
  private strafeFlipTime = 0;

  private readonly dodgeVec = new Phaser.Math.Vector2();
  private dodgeUntil = 0;

  private readonly coverTarget = new Phaser.Math.Vector2();
  private hasCover = false;
  private retreatUntil = 0;
  private retreatCooldownUntil = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    enemyBullets: Phaser.Physics.Arcade.Group,
    playerBullets: Phaser.Physics.Arcade.Group,
    walls: WallDef[],
  ) {
    super(scene, x, y, "enemy_shooter", SMART_BOT_HP);
    this.enemyBullets = enemyBullets;
    this.playerBullets = playerBullets;
    this.weapon = new Pistol();
    this.setWalls(walls);
    this.setTint(0x44ff88); // зелёный — отличать от обычных врагов
  }

  tick(player: Player): void {
    const now = this.scene.time.now;
    this.losCache = this.hasLoS(player);
    if (this.losCache) {
      this.lastKnownPos.set(player.x, player.y);
      if (!this.prevLos) this.losAcquiredAt = now; // rising edge → отсчёт времени реакции
    }
    this.prevLos = this.losCache;

    const dist = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    // Отход в укрытие при низком HP перекрывает обычную логику (выживание/перепозиция).
    if (
      this.retreatUntil === 0 &&
      this.hp <= SMART_BOT_LOW_HP &&
      this.losCache &&
      now >= this.retreatCooldownUntil &&
      (this.state === EnemyState.SHOOT || this.state === EnemyState.CHASE)
    ) {
      this.beginRetreat(player, now);
    }
    if (now < this.retreatUntil) {
      this.runRetreat(player, now);
      return;
    }

    switch (this.state) {
      case EnemyState.IDLE:
        this.setVelocity(0, 0);
        if (dist < SMART_BOT_AGGRO_RANGE && this.losCache) {
          this.state = EnemyState.CHASE;
          this.scene.events.emit("packAlert", this.x, this.y);
        }
        break;

      case EnemyState.CHASE: {
        if (!this.losCache) {
          this.invalidatePath();
          this.state = EnemyState.SEARCH;
          break;
        }
        this.faceTarget(player.x, player.y);
        if (dist <= SMART_BOT_COMBAT_RANGE) {
          this.state = EnemyState.SHOOT;
          break;
        }
        this.moveAlongPath(new Phaser.Math.Vector2(player.x, player.y), SMART_BOT_SPEED);
        break;
      }

      case EnemyState.SHOOT: {
        if (!this.losCache) {
          this.invalidatePath();
          this.state = EnemyState.SEARCH;
          break;
        }
        if (dist > SMART_BOT_COMBAT_RANGE) {
          this.state = EnemyState.CHASE;
          break;
        }
        this.combat(player, dist, now);
        break;
      }

      case EnemyState.SEARCH: {
        if (this.losCache) {
          this.invalidatePath();
          this.state = dist <= SMART_BOT_COMBAT_RANGE ? EnemyState.SHOOT : EnemyState.CHASE;
          break;
        }
        this.moveAlongPath(this.lastKnownPos, SMART_BOT_SPEED);
        if (Phaser.Math.Distance.BetweenPoints(this, this.lastKnownPos) < WAYPOINT_REACH_DIST) {
          this.setVelocity(0, 0);
          this.state = EnemyState.IDLE;
        }
        break;
      }

      default:
        break;
    }
  }

  /** Боевой контакт: движение (уклонение/маневр) + упреждающий прицел и огонь. */
  private combat(player: Player, dist: number, now: number): void {
    // 1. Движение: активное уклонение перебивает всё остальное.
    if (now < this.dodgeUntil) {
      this.setVelocity(this.dodgeVec.x, this.dodgeVec.y);
    } else if (this.tryStartDodge(now)) {
      this.setVelocity(this.dodgeVec.x, this.dodgeVec.y);
    } else if (dist < SMART_BOT_KITE_RETREAT_DIST) {
      this.retreatFrom(player);
    } else if (dist > SMART_BOT_KITE_ADVANCE_DIST) {
      this.moveAlongPath(new Phaser.Math.Vector2(player.x, player.y), SMART_BOT_SPEED);
    } else {
      this.applyStrafe(player, now);
    }

    // 2. Прицел с упреждением + огонь (поворот без разброса, разброс — только в выстрел).
    const aimAngle = this.predictAimAngle(player, dist);
    this.setRotation(aimAngle);
    if (now - this.losAcquiredAt >= SMART_BOT_REACTION_MS) {
      const spread = (Math.random() * 2 - 1) * SMART_BOT_AIM_SPREAD;
      this.weapon.tryFire(this.enemyBullets, this.x, this.y, aimAngle + spread, now);
    }
  }

  /** Базовый угол прицела с линейным упреждением по скорости игрока (без разброса). */
  private predictAimAngle(player: Player, dist: number): number {
    const t = dist / BULLET_SPEED;
    const body = player.body as Phaser.Physics.Arcade.Body | null;
    const aimX = player.x + (body?.velocity.x ?? 0) * t;
    const aimY = player.y + (body?.velocity.y ?? 0) * t;
    return Phaser.Math.Angle.Between(this.x, this.y, aimX, aimY);
  }

  /**
   * Ищет ближайшую летящую в бота пулю игрока и, если она угрожает, выставляет
   * рывок вбок (перпендикулярно её курсу). Возвращает true, если уклонение начато.
   */
  private tryStartDodge(now: number): boolean {
    for (const obj of this.playerBullets.getChildren()) {
      const bullet = obj as Bullet;
      if (!bullet.active) continue;
      const bb = bullet.body as Phaser.Physics.Arcade.Body | null;
      if (!bb) continue;
      const bvx = bb.velocity.x;
      const bvy = bb.velocity.y;
      const speed = Math.hypot(bvx, bvy);
      if (speed < 1) continue;

      const toBotX = this.x - bullet.x;
      const toBotY = this.y - bullet.y;
      if (Math.hypot(toBotX, toBotY) > SMART_BOT_DODGE_RADIUS) continue;

      const nvx = bvx / speed;
      const nvy = bvy / speed;
      // Пуля должна приближаться (двигаться в сторону бота).
      if (toBotX * nvx + toBotY * nvy <= 0) continue;
      // Боковое отклонение траектории от бота: |cross(toBot, nv)|.
      const lateral = Math.abs(toBotX * nvy - toBotY * nvx);
      if (lateral > DODGE_LATERAL_THRESHOLD) continue;

      // Уходим перпендикулярно курсу пули, в ту сторону, где бот уже смещён.
      let perpX = -nvy;
      let perpY = nvx;
      if (toBotX * perpX + toBotY * perpY < 0) {
        perpX = -perpX;
        perpY = -perpY;
      }
      this.dodgeVec.set(perpX * SMART_BOT_SPEED, perpY * SMART_BOT_SPEED);
      this.dodgeUntil = now + SMART_BOT_DODGE_DURATION;
      return true;
    }
    return false;
  }

  private applyStrafe(player: Player, now: number): void {
    if (now >= this.strafeFlipTime) {
      this.strafeSign *= -1;
      this.strafeFlipTime = now + SMART_BOT_STRAFE_FLIP_MS;
    }
    const angleToPlayer = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    const perp = angleToPlayer + this.strafeSign * (Math.PI / 2);
    this.setVelocity(Math.cos(perp) * SMART_BOT_SPEED, Math.sin(perp) * SMART_BOT_SPEED);
  }

  private retreatFrom(player: Player): void {
    const away = Phaser.Math.Angle.Between(player.x, player.y, this.x, this.y);
    this.setVelocity(Math.cos(away) * SMART_BOT_SPEED, Math.sin(away) * SMART_BOT_SPEED);
  }

  private faceTarget(x: number, y: number): void {
    this.setRotation(Phaser.Math.Angle.Between(this.x, this.y, x, y));
  }

  /** Низкое HP: найти укрытие (точку без LoS к игроку) и уйти туда, не стреляя. */
  private beginRetreat(player: Player, now: number): void {
    const cover = this.findCover(player);
    if (!cover) return; // укрытия рядом нет — продолжаем бой
    this.coverTarget.copy(cover);
    this.hasCover = true;
    this.retreatUntil = now + SMART_BOT_RETREAT_MS;
    this.invalidatePath();
  }

  private runRetreat(player: Player, now: number): void {
    this.faceTarget(player.x, player.y); // держим прицел на игроке для быстрого возврата
    const reached =
      this.hasCover &&
      Phaser.Math.Distance.BetweenPoints(this, this.coverTarget) < WAYPOINT_REACH_DIST;
    // В укрытии (нет LoS) или дойдя до точки — завершаем отход досрочно.
    if (reached || !this.losCache) {
      this.endRetreat(now);
      return;
    }
    if (this.hasCover) {
      this.moveAlongPath(this.coverTarget, SMART_BOT_SPEED);
    }
  }

  private endRetreat(now: number): void {
    this.retreatUntil = 0;
    this.hasCover = false;
    this.retreatCooldownUntil = now + SMART_BOT_RETREAT_COOLDOWN_MS;
    this.invalidatePath();
    this.setVelocity(0, 0);
    this.state = EnemyState.CHASE; // снова в бой (лечения нет — прятаться вечно нельзя)
  }

  /**
   * Перебирает кольца проходимых клеток вокруг бота и возвращает ближайшую точку,
   * из которой стена перекрывает линию к игроку. null — подходящего укрытия рядом нет.
   */
  private findCover(player: Player): Phaser.Math.Vector2 | null {
    if (!this.pathfinder) return null;
    let best: Phaser.Math.Vector2 | null = null;
    let bestDist = Number.POSITIVE_INFINITY;
    for (let ring = 2; ring <= 4; ring++) {
      const radius = ring * 64;
      for (let i = 0; i < 16; i++) {
        const a = (i * Math.PI) / 8;
        const cx = this.x + Math.cos(a) * radius;
        const cy = this.y + Math.sin(a) * radius;
        if (!this.pathfinder.isWalkableAt(cx, cy)) continue;
        if (!this.losBlocked(cx, cy, player.x, player.y)) continue; // нужна именно перекрытая LoS
        const d = Phaser.Math.Distance.Between(this.x, this.y, cx, cy);
        if (d < bestDist) {
          bestDist = d;
          best = new Phaser.Math.Vector2(cx, cy);
        }
      }
      if (best) return best; // ближайшее кольцо с укрытием — достаточно
    }
    return best;
  }

  /** true, если хотя бы одна стена пересекает отрезок (ax,ay)→(bx,by). */
  private losBlocked(ax: number, ay: number, bx: number, by: number): boolean {
    if (this.walls === null) return false;
    const line = new Phaser.Geom.Line(ax, ay, bx, by);
    for (const wall of this.walls) {
      const bounds = new Phaser.Geom.Rectangle(
        wall.x - wall.w / 2,
        wall.y - wall.h / 2,
        wall.w,
        wall.h,
      );
      if (Phaser.Geom.Intersects.LineToRectangle(line, bounds)) return true;
    }
    return false;
  }
}
