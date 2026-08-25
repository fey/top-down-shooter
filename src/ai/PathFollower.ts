import {
  PATH_CELL_SIZE,
  PATH_RECALC_DIST,
  STUCK_MOVE_THRESHOLD,
  STUCK_TIME_MS,
  WALL_SEPARATION_STRENGTH,
  WAYPOINT_REACH_DIST,
} from "../config";
import { stuckDecision } from "./behaviors/navigation";
import type { Vec2 } from "./grid";
import { wallSeparationForce } from "./separation";

/**
 * Вид цели навигации. Это не «куда», а «что»: смена вида означает, что враг идёт
 * решать другую задачу, и прежний маршрут больше не годится, даже если новая точка
 * оказалась рядом с прошлой.
 *
 * Ради этого различения тип и существует. Раньше инвалидацию делал вызывающий —
 * `invalidatePath()` руками при каждой резкой смене цели, девять раз в одном `SmartBot`.
 * Инвариант держался на комментарии: забытый вызов давал врага, идущего по маршруту к
 * прошлой цели, и не ловился ничем, кроме ручной игры.
 */
export type NavGoal = "player" | "lastKnown" | "patrol" | "search" | "cover";

/**
 * Всё, что модулю нужно знать о карте. Колбэками, а не ссылкой на `Pathfinder`, — так
 * модуль Phaser-free и проверяется на синтетической сетке.
 */
export interface NavQueries {
  findPath(fromX: number, fromY: number, toX: number, toY: number): Vec2[];
  isWalkable(col: number, row: number): boolean;
  isWalkableAt(x: number, y: number): boolean;
  nearestWalkableWorld(x: number, y: number): Vec2 | null;
}

export interface FollowRequest {
  /** Текущая позиция врага. */
  x: number;
  y: number;
  goal: NavGoal;
  target: Vec2;
  speed: number;
  /** Игровое время, мс — по нему считается застревание. */
  now: number;
}

/**
 * Следование по маршруту: владеет вейпоинтами, стадией восстановления при застревании
 * и решением, когда путь пересчитать. Наружу — один вызов `follow`, который по снимку
 * состояния отдаёт скорость; применяет её оболочка (`Enemy`).
 *
 * Композиция вместо наследования: прежде это состояние жило в protected-полях `Enemy`,
 * и наследники трогали его напрямую. Здесь у него один владелец, поэтому инвариант
 * «сменил цель — пересчитай путь» стал недостижим для нарушения снаружи.
 */
export class PathFollower {
  private readonly nav: NavQueries;

  private waypoints: Vec2[] = [];
  private waypointIndex = 0;
  private goal: NavGoal | null = null;
  private pathedTo: Vec2 | null = null;

  // Определение застревания: где и когда враг был на прошлой проверке.
  private stuckX = 0;
  private stuckY = 0;
  private stuckTime = 0;
  private stuckStage = 0;

  constructor(nav: NavQueries) {
    this.nav = nav;
  }

  /** Оставшиеся вейпоинты (с текущего) — нужны debug-оверлею. */
  remainingWaypoints(): Vec2[] {
    return this.waypoints.slice(this.waypointIndex);
  }

  /** Точка, на которую строился текущий путь, — крестик в debug-оверлее. */
  pathTarget(): Vec2 | null {
    return this.pathedTo;
  }

  /**
   * Забыть маршрут. Нужно там, где цель прыгает, не меняя вида: так `Enemy.aggro`
   * переносит последнюю известную позицию в точку выстрела.
   */
  reset(): void {
    this.waypoints = [];
    this.waypointIndex = 0;
    this.goal = null;
    this.pathedTo = null;
    this.stuckTime = 0;
    this.stuckStage = 0;
  }

  follow(req: FollowRequest): Vec2 {
    const { x, y, target, speed } = req;

    // Физика могла втолкнуть врага в стену. Пока он внутри непроходимой клетки, любой
    // маршрут бессмыслен: сначала выбраться, и на 1.5× скорости — иначе отклик
    // коллизии задавит выталкивание обратно.
    if (!this.nav.isWalkableAt(x, y)) {
      const wayOut = this.nav.nearestWalkableWorld(x, y);
      if (wayOut) {
        return direction(x, y, wayOut.x, wayOut.y, speed * 1.5);
      }
    }

    if (this.needsRepath(req)) {
      this.recalc(req);
    }

    if (this.waypoints.length === 0) {
      // Пути нет — идём напрямую. Без отталкивания от стен: оно осмысленно только
      // как поправка к маршруту, а здесь уводило бы врага вбок от самой цели.
      return direction(x, y, target.x, target.y, speed);
    }

    this.recoverIfStuck(req);

    const wp = this.waypoints[this.waypointIndex];
    if (wp && distance(x, y, wp.x, wp.y) < WAYPOINT_REACH_DIST) {
      this.waypointIndex++;
      if (this.waypointIndex >= this.waypoints.length) {
        // Маршрут пройден. Дошли ли до самой цели, решает вызывающий — ему это нужно
        // для перехода состояния, а модулю знать не обязательно.
        this.waypoints = [];
        this.stuckTime = 0;
        return { x: 0, y: 0 };
      }
    }

    const current = this.waypoints[this.waypointIndex];
    if (!current) return { x: 0, y: 0 };

    const v = direction(x, y, current.x, current.y, speed);
    const push = wallSeparationForce(
      x,
      y,
      PATH_CELL_SIZE,
      PATH_CELL_SIZE,
      WALL_SEPARATION_STRENGTH,
      (col, row) => this.nav.isWalkable(col, row),
    );
    return { x: v.x + push.x, y: v.y + push.y };
  }

  /**
   * Пересчёт нужен в трёх случаях: сменился вид цели, цель ушла дальше
   * `PATH_RECALC_DIST` или маршрута нет вовсе (первый вызов либо пройден до конца).
   */
  private needsRepath(req: FollowRequest): boolean {
    if (this.goal !== req.goal) return true;
    if (this.waypoints.length === 0) return true;
    const to = this.pathedTo;
    if (!to) return true;
    return distance(to.x, to.y, req.target.x, req.target.y) > PATH_RECALC_DIST;
  }

  private recalc(req: FollowRequest): void {
    this.goal = req.goal;
    this.pathedTo = { x: req.target.x, y: req.target.y };
    this.waypointIndex = 0;
    this.stuckTime = 0; // окно проверки застревания взводится заново на новом пути
    this.waypoints = this.nav.findPath(req.x, req.y, req.target.x, req.target.y);
  }

  /**
   * Двухстадийное восстановление: не сдвинулся за окно — пропустить вейпоинт, не
   * сдвинулся снова — пересчитать путь. Само решение — чистая stuckDecision.
   */
  private recoverIfStuck(req: FollowRequest): void {
    const { x, y, now } = req;
    if (this.stuckTime === 0) {
      this.stuckX = x;
      this.stuckY = y;
      this.stuckTime = now;
      return;
    }
    if (now - this.stuckTime <= STUCK_TIME_MS) return;

    const moved = distance(x, y, this.stuckX, this.stuckY);
    const { action, nextStage } = stuckDecision(moved, this.stuckStage, STUCK_MOVE_THRESHOLD);
    this.stuckStage = nextStage;
    if (action === "skip") {
      this.waypointIndex = Math.min(this.waypointIndex + 1, this.waypoints.length - 1);
    } else if (action === "repath") {
      this.recalc(req);
    }
    this.stuckX = x;
    this.stuckY = y;
    this.stuckTime = now;
  }
}

function distance(ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Вектор длиной `speed` из (ax, ay) в (bx, by). */
function direction(ax: number, ay: number, bx: number, by: number, speed: number): Vec2 {
  const angle = Math.atan2(by - ay, bx - ax);
  return { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed };
}
