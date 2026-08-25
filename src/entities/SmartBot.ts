import Phaser from "phaser";
import { evaluateDodge, kiteAction, predictAimAngle } from "../ai/behaviors/combat";
import { anyWallBlocks } from "../ai/geometry";
import {
  BULLET_SPEED,
  ENEMY_BODY_RADIUS,
  PATH_CELL_SIZE,
  SMART_BOT_AGGRO_RANGE,
  SMART_BOT_AIM_SPREAD_RAD,
  SMART_BOT_COMBAT_RANGE,
  SMART_BOT_DODGE_DURATION,
  SMART_BOT_DODGE_LATERAL_MULT,
  SMART_BOT_DODGE_RADIUS,
  SMART_BOT_HP,
  SMART_BOT_KITE_ADVANCE_DIST,
  SMART_BOT_KITE_RETREAT_DIST,
  SMART_BOT_LOS_GRACE_MS,
  SMART_BOT_LOW_HP,
  SMART_BOT_PATROL_MIN_DIST,
  SMART_BOT_REACTION_MS,
  SMART_BOT_RETREAT_COOLDOWN_MS,
  SMART_BOT_RETREAT_MS,
  SMART_BOT_SEARCH_DURATION,
  SMART_BOT_SEARCH_RADIUS,
  SMART_BOT_SPEED,
  SMART_BOT_STRAFE_FLIP_MS,
  WAYPOINT_REACH_DIST,
  WEAPONS,
} from "../config";
import { emitGameEvent, PACK_ALERT } from "../events";
import type { WallDef } from "../types";
import { jitterAngle } from "../weapons/accuracy";
import { Weapon } from "../weapons/Weapon";
import { type Bullet, spawnBullets } from "./Bullet";
import { Enemy, EnemyState } from "./Enemy";
import type { Player } from "./Player";

/** Боковой зазор, при котором летящая пуля считается угрозой (≈ диаметр тела бота). */
const DODGE_LATERAL_THRESHOLD = ENEMY_BODY_RADIUS * SMART_BOT_DODGE_LATERAL_MULT;

/**
 * Умный бот — соперник уровня игрока (то же HP/скорость/оружие), но с продвинутым ИИ
 * в духе ботов Quake 3: упреждающий прицел с моделью точности/реакции, уклонение от пуль,
 * тактика укрытий при низком HP и кайтинг со стрейфом.
 * Стреляет пистолетом (`WEAPONS.pistol`, как стартовое оружие игрока) в группу `enemyBullets`;
 * оружие не меняет — пикапы предназначены игроку. Отслеживает `playerBullets`
 * для уклонения. Переиспользует навигацию и LoS базового класса `Enemy`.
 */
export class SmartBot extends Enemy {
  private readonly enemyBullets: Phaser.Physics.Arcade.Group;
  private readonly playerBullets: Phaser.Physics.Arcade.Group;
  private readonly weapon: Weapon;

  private prevLos = false;
  private losAcquiredAt = 0;
  // Когда LoS пропала. NEGATIVE_INFINITY → самое первое обнаружение взводит реакцию.
  private losLostAt = Number.NEGATIVE_INFINITY;

  private readonly dodgeVec = new Phaser.Math.Vector2();
  private dodgeUntil = 0;

  private readonly coverTarget = new Phaser.Math.Vector2();
  private hasCover = false;
  private retreatUntil = 0;
  private retreatCooldownUntil = 0;

  private readonly patrolTarget = new Phaser.Math.Vector2();
  private hasPatrolTarget = false;
  private readonly searchTarget = new Phaser.Math.Vector2();
  private hasSearchTarget = false;
  private searchUntil = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    enemyBullets: Phaser.Physics.Arcade.Group,
    playerBullets: Phaser.Physics.Arcade.Group,
    walls: WallDef[],
  ) {
    super(scene, x, y, "enemy_smart", SMART_BOT_HP);
    this.enemyBullets = enemyBullets;
    this.playerBullets = playerBullets;
    this.weapon = new Weapon(WEAPONS.pistol);
    this.setWalls(walls);
    this.state = EnemyState.PATROL; // активный охотник: роумит по карте с самого старта
  }

  tick(player: Player): void {
    const now = this.scene.time.now;
    this.losCache = this.hasLoS(player);
    if (this.losCache) {
      this.rememberLastKnown(player.x, player.y);
      // Взводим реакцию только на настоящую завязку боя: если игрок был невидим
      // дольше grace. Короткое мигание LoS (заход за угол на доли секунды) реакцию
      // не перевзводит → темп стрельбы в бою остаётся чисто оружейным.
      if (!this.prevLos && now - this.losLostAt > SMART_BOT_LOS_GRACE_MS) {
        this.losAcquiredAt = now;
      }
    } else if (this.prevLos) {
      this.losLostAt = now; // falling edge
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
        // SmartBot не простаивает — сразу переходит к патрулированию.
        this.state = EnemyState.PATROL;
        break;

      case EnemyState.PATROL: {
        if (dist < SMART_BOT_AGGRO_RANGE && this.losCache) {
          this.hasPatrolTarget = false;
          this.invalidatePath();
          this.state = EnemyState.CHASE;
          emitGameEvent(this.scene.events, PACK_ALERT, this.x, this.y);
          break;
        }
        this.patrol();
        break;
      }

      case EnemyState.CHASE: {
        if (!this.losCache) {
          this.enterSearch();
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
          this.enterSearch();
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
        this.search(now);
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
    } else {
      switch (kiteAction(dist, SMART_BOT_KITE_RETREAT_DIST, SMART_BOT_KITE_ADVANCE_DIST)) {
        case "retreat":
          this.retreatFrom(player, SMART_BOT_SPEED);
          break;
        case "advance":
          this.moveAlongPath(new Phaser.Math.Vector2(player.x, player.y), SMART_BOT_SPEED);
          break;
        case "strafe":
          this.applyStrafe(player, SMART_BOT_SPEED, SMART_BOT_STRAFE_FLIP_MS, now);
          break;
      }
    }

    // 2. Прицел с упреждением + огонь (поворот без разброса, разброс — только в выстрел).
    const aimAngle = this.aimAngleAt(player, dist);
    this.setRotation(aimAngle);
    if (now - this.losAcquiredAt >= SMART_BOT_REACTION_MS) {
      // Разброс стрелка считает тот же jitterAngle, что и неточность ствола: одна
      // единица (полный конус), один кламп. Случайность — здесь, в оболочке.
      const aimWithSpread = jitterAngle(aimAngle, SMART_BOT_AIM_SPREAD_RAD, Math.random() * 2 - 1);
      const shot = this.weapon.tryFire(this.x, this.y, aimWithSpread, now);
      spawnBullets(this.enemyBullets, shot);
    }
  }

  /** Базовый угол прицела с линейным упреждением по скорости игрока (без разброса). */
  private aimAngleAt(player: Player, dist: number): number {
    const body = player.body as Phaser.Physics.Arcade.Body | null;
    return predictAimAngle(
      { x: this.x, y: this.y },
      { x: player.x, y: player.y },
      { x: body?.velocity.x ?? 0, y: body?.velocity.y ?? 0 },
      BULLET_SPEED,
      dist,
    );
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

      const dodge = evaluateDodge(
        { x: this.x, y: this.y },
        { x: bullet.x, y: bullet.y },
        { x: bb.velocity.x, y: bb.velocity.y },
        {
          dodgeRadius: SMART_BOT_DODGE_RADIUS,
          lateralThreshold: DODGE_LATERAL_THRESHOLD,
          speed: SMART_BOT_SPEED,
        },
      );
      if (dodge) {
        this.dodgeVec.set(dodge.x, dodge.y);
        this.dodgeUntil = now + SMART_BOT_DODGE_DURATION;
        return true;
      }
    }
    return false;
  }

  /** Переход в поиск после потери LoS: идём к lastKnownPos, район ещё не обыскиваем. */
  private enterSearch(): void {
    this.invalidatePath();
    this.searchUntil = 0; // обыск района взведём по прибытии в lastKnownPos
    this.hasSearchTarget = false;
    this.state = EnemyState.SEARCH;
  }

  /** Роуминг по карте: идём к случайной проходимой точке, по достижении выбираем новую. */
  private patrol(): void {
    if (!this.hasPatrolTarget) {
      const t = this.pickRoamTarget(this.x, this.y, SMART_BOT_PATROL_MIN_DIST);
      if (!t) {
        this.setVelocity(0, 0);
        return; // карта без проходимых клеток — теоретически невозможно
      }
      this.patrolTarget.copy(t);
      this.hasPatrolTarget = true;
      this.invalidatePath();
    }
    this.faceTarget(this.patrolTarget.x, this.patrolTarget.y);
    this.moveAlongPath(this.patrolTarget, SMART_BOT_SPEED);
    if (Phaser.Math.Distance.BetweenPoints(this, this.patrolTarget) < WAYPOINT_REACH_DIST) {
      this.hasPatrolTarget = false; // выберем новую точку на следующем тике
    }
  }

  /**
   * Поиск после потери цели: сперва дойти до lastKnownPos, затем обыскивать район
   * (случайные точки в радиусе) в течение SMART_BOT_SEARCH_DURATION; иначе — к патрулю.
   */
  private search(now: number): void {
    // Фаза 1: идём к последней увиденной позиции.
    if (this.searchUntil === 0) {
      this.faceTarget(this.lastKnownPos.x, this.lastKnownPos.y);
      this.moveAlongPath(this.lastKnownPos, SMART_BOT_SPEED);
      if (Phaser.Math.Distance.BetweenPoints(this, this.lastKnownPos) < WAYPOINT_REACH_DIST) {
        this.searchUntil = now + SMART_BOT_SEARCH_DURATION; // начать обыск района
        this.hasSearchTarget = false;
        this.invalidatePath();
      }
      return;
    }
    // Фаза 2: район обыскан по времени — возврат к патрулированию.
    if (now >= this.searchUntil) {
      this.searchUntil = 0;
      this.hasSearchTarget = false;
      this.hasPatrolTarget = false;
      this.invalidatePath();
      this.state = EnemyState.PATROL;
      return;
    }
    // Фаза 2: ходим по случайным точкам вокруг lastKnownPos.
    if (!this.hasSearchTarget) {
      const t = this.pickRoamTarget(
        this.lastKnownPos.x,
        this.lastKnownPos.y,
        0,
        SMART_BOT_SEARCH_RADIUS,
      );
      if (t) {
        this.searchTarget.copy(t);
        this.hasSearchTarget = true;
        this.invalidatePath();
      }
    }
    if (this.hasSearchTarget) {
      this.faceTarget(this.searchTarget.x, this.searchTarget.y);
      this.moveAlongPath(this.searchTarget, SMART_BOT_SPEED);
      if (Phaser.Math.Distance.BetweenPoints(this, this.searchTarget) < WAYPOINT_REACH_DIST) {
        this.hasSearchTarget = false;
      }
    }
  }

  /**
   * Случайная проходимая точка для роуминга/обыска. `minDist` — минимум от (fromX,fromY);
   * `maxDist` (если задан) — максимум, для локального обыска вокруг точки. До 12 попыток.
   */
  private pickRoamTarget(
    fromX: number,
    fromY: number,
    minDist: number,
    maxDist = Number.POSITIVE_INFINITY,
  ): Phaser.Math.Vector2 | null {
    if (!this.pathfinder) return null;
    let fallback: Phaser.Math.Vector2 | null = null;
    for (let i = 0; i < 12; i++) {
      const p = this.pathfinder.randomWalkableWorld();
      if (!p) return null;
      fallback = p;
      const d = Phaser.Math.Distance.Between(fromX, fromY, p.x, p.y);
      if (d >= minDist && d <= maxDist) return p;
    }
    return fallback; // не нашли в диапазоне — берём последнюю проходимую
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
      const radius = ring * PATH_CELL_SIZE;
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
    return anyWallBlocks(ax, ay, bx, by, this.walls);
  }
}
