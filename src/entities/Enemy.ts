import Phaser from "phaser";
import type { Pathfinder } from "../ai/Pathfinder";
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

  private waypoints: Phaser.Math.Vector2[] = [];
  private waypointIndex = 0;
  private readonly lastPathTarget = new Phaser.Math.Vector2(-9999, -9999);

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
    const line = new Phaser.Geom.Line(this.x, this.y, player.x, player.y);
    for (const wall of this.walls) {
      const bounds = new Phaser.Geom.Rectangle(
        wall.x - wall.w / 2,
        wall.y - wall.h / 2,
        wall.w,
        wall.h,
      );
      if (Phaser.Geom.Intersects.LineToRectangle(line, bounds)) return false;
    }
    return true;
  }

  getWaypoints(): Phaser.Math.Vector2[] {
    return this.waypoints;
  }

  getLastPathTarget(): Phaser.Math.Vector2 | null {
    if (this.lastPathTarget.x === -9999 && this.lastPathTarget.y === -9999) return null;
    return this.lastPathTarget;
  }

  /**
   * Invalidates the cached path so the next moveAlongPath call
   * unconditionally recalculates. Use when the navigation target changes
   * abruptly (e.g., switching from the player to lastKnownPos on LoS loss).
   */
  invalidatePath(): void {
    this.lastPathTarget.set(-9999, -9999);
    this.waypoints = [];
    this.waypointIndex = 0;
    this.stuckCheckTime = 0;
    this.stuckRecoveryStage = 0;
    this.stuckCheckPos.set(this.x, this.y);
  }

  takeDamage(amount: number): void {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.scene.events.emit("enemyDied", this);
      this.destroy();
    }
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
      if (moved < STUCK_MOVE_THRESHOLD) {
        if (this.stuckRecoveryStage === 0) {
          // Stage 1: skip current waypoint and try the next one
          this.waypointIndex = Math.min(this.waypointIndex + 1, this.waypoints.length - 1);
          this.stuckRecoveryStage = 1;
        } else {
          // Stage 2: force a full repath from current position
          this.recalcPath(target);
          this.stuckRecoveryStage = 0;
        }
      } else {
        this.stuckRecoveryStage = 0; // made real progress, reset recovery stage
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
    if (!this.pathfinder) return new Phaser.Math.Vector2(0, 0);

    this.wallForceAccum.set(0, 0);
    const sampleDist = PATH_CELL_SIZE;

    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      const sx = this.x + Math.cos(angle) * sampleDist;
      const sy = this.y + Math.sin(angle) * sampleDist;
      const { col, row } = this.pathfinder.worldToGridCell(sx, sy);

      if (!this.pathfinder.isWalkable(col, row)) {
        // Cell centre in world space
        const cellCx = col * PATH_CELL_SIZE + PATH_CELL_SIZE / 2;
        const cellCy = row * PATH_CELL_SIZE + PATH_CELL_SIZE / 2;
        const dx = this.x - cellCx;
        const dy = this.y - cellCy;
        const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
        // Repulsion: direction from cell toward enemy, weighted by 1/dist
        this.wallForceAccum.x += (dx / dist) * (1 / dist);
        this.wallForceAccum.y += (dy / dist) * (1 / dist);
      }
    }

    if (this.wallForceAccum.lengthSq() > 0) {
      this.wallForceAccum.normalize().scale(WALL_SEPARATION_STRENGTH);
    }
    return new Phaser.Math.Vector2(this.wallForceAccum.x, this.wallForceAccum.y);
  }

  private recalcPath(target: Phaser.Math.Vector2): void {
    this.lastPathTarget.copy(target);
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
