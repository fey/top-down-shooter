import Phaser from "phaser";
import { stuckDecision } from "../ai/behaviors/navigation";
import { anyWallBlocks } from "../ai/geometry";
import type { Pathfinder } from "../ai/Pathfinder";
import { wallSeparationForce } from "../ai/separation";
import {
  ENEMY_BODY_RADIUS,
  ENEMY_SPRITE_SCALE,
  PATH_CELL_SIZE,
  PATH_RECALC_DIST,
  STUCK_MOVE_THRESHOLD,
  STUCK_TIME_MS,
  WALL_SEPARATION_STRENGTH,
  WAYPOINT_REACH_DIST,
} from "../config";
import type { WallDef } from "../types";
import type { Player } from "./Player";

export enum EnemyState {
  IDLE = "IDLE",
  PATROL = "PATROL",
  CHASE = "CHASE",
  ATTACK = "ATTACK",
  SHOOT = "SHOOT",
  STRAFE = "STRAFE",
  SEARCH = "SEARCH",
}

export abstract class Enemy extends Phaser.Physics.Arcade.Sprite {
  hp: number;
  override state: EnemyState = EnemyState.IDLE;
  protected pathfinder: Pathfinder | null = null;
  protected walls: WallDef[] | null = null;
  /** LoS к игроку, кэшируется наследниками в начале каждого tick(). */
  protected losCache = false;

  /** Последняя позиция, где игрок был виден. Заполняется через rememberLastKnown(). */
  protected readonly lastKnownPos = new Phaser.Math.Vector2();
  protected hasLastKnown = false;

  // Боковое маневрирование (circle-strafe) — общее для стреляющих врагов.
  protected strafeSign = 1;
  protected strafeFlipTime = 0;

  private waypoints: Phaser.Math.Vector2[] = [];
  private waypointIndex = 0;
  private readonly lastPathTarget = new Phaser.Math.Vector2();
  private hasPathTarget = false;

  // Stuck detection state
  private readonly stuckCheckPos = new Phaser.Math.Vector2();
  private stuckCheckTime = 0;
  private stuckRecoveryStage = 0; // 0=normal, 1=waypoint-skip tried

  // Wall separation force accumulator (reused each frame to avoid allocation)
  private readonly wallForceAccum = new Phaser.Math.Vector2();

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string, hp: number) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setScale(ENEMY_SPRITE_SCALE);
    const r = ENEMY_BODY_RADIUS;
    this.setCircle(r, this.width / 2 - r, this.height / 2 - r);
    this.hp = hp;
  }

  setPathfinder(pf: Pathfinder): void {
    this.pathfinder = pf;
  }

  setWalls(walls: WallDef[]): void {
    this.walls = walls;
  }

  protected hasLoS(player: Player): boolean {
    if (this.walls === null) return true;
    return !anyWallBlocks(this.x, this.y, player.x, player.y, this.walls);
  }

  /** Текущее закэшированное LoS-состояние — для дебаг-отрисовки. */
  getLosToPlayer(): boolean {
    return this.losCache;
  }

  /** Оставшиеся вейпоинты (с текущего waypointIndex) — для debug-оверлея. */
  getRemainingWaypoints(): Phaser.Math.Vector2[] {
    return this.waypoints.slice(this.waypointIndex);
  }

  getLastPathTarget(): Phaser.Math.Vector2 | null {
    return this.hasPathTarget ? this.lastPathTarget : null;
  }

  /**
   * Invalidates the cached path so the next moveAlongPath call
   * unconditionally recalculates. Use when the navigation target changes
   * abruptly (e.g., switching from the player to lastKnownPos on LoS loss).
   */
  invalidatePath(): void {
    this.hasPathTarget = false;
    this.waypoints = [];
    this.waypointIndex = 0;
    this.stuckCheckTime = 0;
    this.stuckRecoveryStage = 0;
    this.stuckCheckPos.set(this.x, this.y);
  }

  /**
   * Агро извне: враг узнал о противнике, не увидев его — по попаданию или по
   * пуле, прошедшей рядом. Целью становится точка выстрела: враг идёт разбираться туда,
   * откуда стреляли, а не к игроку напрямую — иначе стрельба из-за угла давала бы врагу
   * знание, которого у него нет.
   *
   * Срабатывает только в состояниях, где враг ещё не в бою: уже преследующему или
   * стреляющему агро не нужно, а сброс цели сбил бы ему текущий манёвр.
   */
  aggro(sourceX: number, sourceY: number): void {
    const unaware =
      this.state === EnemyState.IDLE ||
      this.state === EnemyState.PATROL ||
      this.state === EnemyState.SEARCH;
    if (!unaware) return;
    this.rememberLastKnown(sourceX, sourceY);
    this.invalidatePath();
    this.state = EnemyState.CHASE;
  }

  takeDamage(amount: number): void {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.scene.events.emit("enemyDied", this);
      this.destroy();
    }
  }

  /** Запоминает последнюю известную позицию игрока (вызывать, когда есть LoS). */
  protected rememberLastKnown(x: number, y: number): void {
    this.lastKnownPos.set(x, y);
    this.hasLastKnown = true;
  }

  /** Поворачивает спрайт лицом к точке (восток спрайта = угол 0). */
  protected faceTarget(x: number, y: number): void {
    this.setRotation(Phaser.Math.Angle.Between(this.x, this.y, x, y));
  }

  /** Отступление по прямой от игрока, не разворачиваясь. */
  protected retreatFrom(player: Player, speed: number): void {
    const away = Phaser.Math.Angle.Between(player.x, player.y, this.x, this.y);
    this.setVelocity(Math.cos(away) * speed, Math.sin(away) * speed);
  }

  /**
   * Стрейф: движение перпендикулярно направлению на игрока со сменой стороны.
   * Знак направления переворачивается каждые flipPeriodMs мс.
   */
  protected applyStrafe(player: Player, speed: number, flipPeriodMs: number, now: number): void {
    if (now >= this.strafeFlipTime) {
      this.strafeSign *= -1;
      this.strafeFlipTime = now + flipPeriodMs;
    }
    const angleToPlayer = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
    const perp = angleToPlayer + this.strafeSign * (Math.PI / 2);
    this.setVelocity(Math.cos(perp) * speed, Math.sin(perp) * speed);
  }

  moveAlongPath(target: Phaser.Math.Vector2, speed: number): void {
    // Escape if physically inside a blocked grid cell (e.g. pushed into wall by physics)
    if (this.pathfinder && !this.pathfinder.isWalkableAt(this.x, this.y)) {
      const escapeTarget = this.pathfinder.nearestWalkableWorld(this.x, this.y);
      if (escapeTarget) {
        const angle = Phaser.Math.Angle.Between(this.x, this.y, escapeTarget.x, escapeTarget.y);
        // 1.5× speed so escape force overcomes collision response pushing us back
        this.setVelocity(Math.cos(angle) * speed * 1.5, Math.sin(angle) * speed * 1.5);
        return;
      }
    }

    const targetMoved =
      Phaser.Math.Distance.BetweenPoints(target, this.lastPathTarget) > PATH_RECALC_DIST;

    if (targetMoved || this.waypoints.length === 0) {
      this.recalcPath(target);
    }

    if (this.waypoints.length === 0) {
      // No path found — fall back to direct movement
      const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
      this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      return;
    }

    // Stuck detection: if enemy hasn't moved STUCK_MOVE_THRESHOLD px in STUCK_TIME_MS ms
    // while following a path, skip current waypoint or force a repath.
    const now = this.scene.time.now;
    if (this.stuckCheckTime === 0) {
      this.stuckCheckPos.set(this.x, this.y);
      this.stuckCheckTime = now;
    } else if (now - this.stuckCheckTime > STUCK_TIME_MS) {
      const moved = Phaser.Math.Distance.BetweenPoints(this, this.stuckCheckPos);
      const { action, nextStage } = stuckDecision(
        moved,
        this.stuckRecoveryStage,
        STUCK_MOVE_THRESHOLD,
      );
      this.stuckRecoveryStage = nextStage;
      if (action === "skip") {
        // skip current waypoint and try the next one
        this.waypointIndex = Math.min(this.waypointIndex + 1, this.waypoints.length - 1);
      } else if (action === "repath") {
        // force a full repath from current position
        this.recalcPath(target);
      }
      this.stuckCheckPos.set(this.x, this.y);
      this.stuckCheckTime = now;
    }

    const wp = this.waypoints[this.waypointIndex];
    if (wp && Phaser.Math.Distance.Between(this.x, this.y, wp.x, wp.y) < WAYPOINT_REACH_DIST) {
      this.waypointIndex++;
      if (this.waypointIndex >= this.waypoints.length) {
        this.waypoints = [];
        this.stuckCheckTime = 0; // reset so detection restarts on next path
        this.setVelocity(0, 0);
        return;
      }
    }

    const current = this.waypoints[this.waypointIndex];
    if (!current) return;
    const angle = Phaser.Math.Angle.Between(this.x, this.y, current.x, current.y);
    const wallForce = this.getWallSeparationForce();
    this.setVelocity(Math.cos(angle) * speed + wallForce.x, Math.sin(angle) * speed + wallForce.y);
  }

  /**
   * Samples 8 directions at PATH_CELL_SIZE distance and returns a repulsion
   * force pushing the enemy away from nearby blocked grid cells.
   * Weight = 1/distance (linear, not squared — keeps the force gentle).
   */
  private getWallSeparationForce(): Phaser.Math.Vector2 {
    if (!this.pathfinder) return this.wallForceAccum.set(0, 0);
    const pf = this.pathfinder;
    const force = wallSeparationForce(
      this.x,
      this.y,
      PATH_CELL_SIZE,
      PATH_CELL_SIZE,
      WALL_SEPARATION_STRENGTH,
      (col, row) => pf.isWalkable(col, row),
    );
    return this.wallForceAccum.set(force.x, force.y);
  }

  private recalcPath(target: Phaser.Math.Vector2): void {
    this.lastPathTarget.copy(target);
    this.hasPathTarget = true;
    this.waypointIndex = 0;
    this.stuckCheckTime = 0; // reset stuck detection for the new path
    if (this.pathfinder) {
      this.waypoints = this.pathfinder.findPath(this.x, this.y, target.x, target.y);
    } else {
      this.waypoints = [];
    }
  }

  abstract tick(player: Player): void;
}
