import Phaser from "phaser";
import type { Pathfinder } from "../ai/Pathfinder";
import {
  DODGE_ANGLE_THRESHOLD,
  DODGE_COOLDOWN,
  DODGE_DURATION,
  DODGE_SPEED_MULT,
  PATH_RECALC_DIST,
  WAYPOINT_REACH_DIST,
} from "../config";
import type { Player } from "./Player";

export enum EnemyState {
  IDLE = "IDLE",
  CHASE = "CHASE",
  ATTACK = "ATTACK",
  SHOOT = "SHOOT",
  STRAFE = "STRAFE",
  DODGE = "DODGE",
  SEARCH = "SEARCH",
}

export abstract class Enemy extends Phaser.Physics.Arcade.Sprite {
  hp: number;
  override state: EnemyState = EnemyState.IDLE;
  prevState: EnemyState = EnemyState.IDLE;
  flankAngle = 0;
  flankRadius = 0;
  protected baseSpeed = 0;
  protected pathfinder: Pathfinder | null = null;

  private lastDodgeTime = 0;
  private dodgeEndTime = 0;
  private readonly dodgeVel = new Phaser.Math.Vector2();

  private waypoints: Phaser.Math.Vector2[] = [];
  private waypointIndex = 0;
  private readonly lastPathTarget = new Phaser.Math.Vector2(-9999, -9999);

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string, hp: number) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.hp = hp;
  }

  setPathfinder(pf: Pathfinder): void {
    this.pathfinder = pf;
  }

  getWaypoints(): Phaser.Math.Vector2[] {
    return this.waypoints;
  }

  getLastPathTarget(): Phaser.Math.Vector2 | null {
    if (this.lastPathTarget.x === -9999 && this.lastPathTarget.y === -9999) return null;
    return this.lastPathTarget;
  }

  takeDamage(amount: number): void {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.scene.events.emit("enemyDied", this);
      this.destroy();
    }
  }

  getSlotPos(player: Player): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(
      player.x + Math.cos(this.flankAngle) * this.flankRadius,
      player.y + Math.sin(this.flankAngle) * this.flankRadius,
    );
  }

  moveAlongPath(target: Phaser.Math.Vector2, speed: number): void {
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

    const wp = this.waypoints[this.waypointIndex];
    if (wp && Phaser.Math.Distance.Between(this.x, this.y, wp.x, wp.y) < WAYPOINT_REACH_DIST) {
      this.waypointIndex++;
      if (this.waypointIndex >= this.waypoints.length) {
        this.waypoints = [];
        this.setVelocity(0, 0);
        return;
      }
    }

    const current = this.waypoints[this.waypointIndex];
    if (!current) return;
    const angle = Phaser.Math.Angle.Between(this.x, this.y, current.x, current.y);
    this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
  }

  private recalcPath(target: Phaser.Math.Vector2): void {
    this.lastPathTarget.copy(target);
    this.waypointIndex = 0;
    if (this.pathfinder) {
      this.waypoints = this.pathfinder.findPath(this.x, this.y, target.x, target.y);
    } else {
      this.waypoints = [];
    }
  }

  // Returns true while in DODGE — caller skips its own tick logic
  checkAndTriggerDodge(player: Player): boolean {
    const now = this.scene.time.now;

    if (this.state === EnemyState.DODGE) {
      if (now >= this.dodgeEndTime) {
        this.state = this.prevState;
      } else {
        this.setVelocity(this.dodgeVel.x, this.dodgeVel.y);
      }
      return true;
    }

    if (this.state === EnemyState.IDLE) return false;
    if (now - this.lastDodgeTime < DODGE_COOLDOWN) return false;

    const aimAngle = player.rotation - Math.PI / 2;
    const angleToEnemy = Phaser.Math.Angle.Between(player.x, player.y, this.x, this.y);
    const diff = Math.abs(Phaser.Math.Angle.Wrap(aimAngle - angleToEnemy));

    if (diff < DODGE_ANGLE_THRESHOLD) {
      this.prevState = this.state;
      this.state = EnemyState.DODGE;
      this.lastDodgeTime = now;
      this.dodgeEndTime = now + DODGE_DURATION;

      const side = Math.random() < 0.5 ? 1 : -1;
      const speed = this.baseSpeed * DODGE_SPEED_MULT;
      const perpAngle = angleToEnemy + side * (Math.PI / 2);
      this.dodgeVel.set(Math.cos(perpAngle) * speed, Math.sin(perpAngle) * speed);
    }

    return false;
  }

  abstract tick(player: Player): void;
}
