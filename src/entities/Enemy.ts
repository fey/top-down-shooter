import Phaser from "phaser";
import { DODGE_ANGLE_THRESHOLD, DODGE_COOLDOWN, DODGE_DURATION, DODGE_SPEED_MULT } from "../config";
import type { Player } from "./Player";

export enum EnemyState {
  IDLE = "IDLE",
  CHASE = "CHASE",
  ATTACK = "ATTACK",
  SHOOT = "SHOOT",
  STRAFE = "STRAFE",
  DODGE = "DODGE",
}

export abstract class Enemy extends Phaser.Physics.Arcade.Sprite {
  hp: number;
  override state: EnemyState = EnemyState.IDLE;
  prevState: EnemyState = EnemyState.IDLE;
  flankAngle = 0;
  flankRadius = 0;
  protected baseSpeed = 0;

  private lastDodgeTime = 0;
  private dodgeEndTime = 0;
  private readonly dodgeVel = new Phaser.Math.Vector2();

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string, hp: number) {
    super(scene, x, y, texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.hp = hp;
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
