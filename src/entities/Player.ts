import Phaser from "phaser";
import { PLAYER_BODY_RADIUS, PLAYER_HP, PLAYER_SPEED, PLAYER_SPRITE_SCALE } from "../config";
import { Pistol } from "../weapons/Pistol";
import type { Weapon } from "../weapons/Weapon";

type CursorKeys = {
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
};

export class Player extends Phaser.Physics.Arcade.Sprite {
  private keys: CursorKeys;
  private weapon: Weapon;
  private bulletGroup: Phaser.Physics.Arcade.Group;
  private invincibleUntil = 0;
  hp: number;

  constructor(scene: Phaser.Scene, x: number, y: number, bulletGroup: Phaser.Physics.Arcade.Group) {
    super(scene, x, y, "player");
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setScale(PLAYER_SPRITE_SCALE);
    const r = PLAYER_BODY_RADIUS;
    this.setCircle(r, this.width / 2 - r, this.height / 2 - r);
    this.setCollideWorldBounds(true);
    this.hp = PLAYER_HP;

    const keyboard = scene.input.keyboard;
    if (!keyboard) throw new Error("Keyboard plugin unavailable");
    this.keys = keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as CursorKeys;

    this.bulletGroup = bulletGroup;
    this.weapon = new Pistol();
  }

  takeDamage(amount: number): void {
    if (!this.active || !this.scene) return;
    const now = this.scene.time.now;
    if (now < this.invincibleUntil) return;
    this.invincibleUntil = now + 500;

    this.hp -= amount;
    this.scene.events.emit("hpChanged", this.hp);

    this.setTint(0xff4444);
    this.scene.time.delayedCall(150, () => {
      if (this.active) this.clearTint();
    });

    if (this.hp <= 0) {
      this.setActive(false).setVisible(false);
      this.scene.events.emit("playerDied");
    }
  }

  override update(): void {
    const dx = (this.keys.right.isDown ? 1 : 0) - (this.keys.left.isDown ? 1 : 0);
    const dy = (this.keys.down.isDown ? 1 : 0) - (this.keys.up.isDown ? 1 : 0);

    if (dx !== 0 || dy !== 0) {
      const vel = new Phaser.Math.Vector2(dx, dy).normalize().scale(PLAYER_SPEED);
      this.setVelocity(vel.x, vel.y);
    } else {
      this.setVelocity(0, 0);
    }

    const pointer = this.scene.input.activePointer;
    const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const angle = Phaser.Math.Angle.Between(this.x, this.y, worldPoint.x, worldPoint.y);
    this.setRotation(angle);

    if (pointer.isDown) {
      this.weapon.tryFire(this.bulletGroup, this.x, this.y, angle, this.scene.time.now);
    }
  }
}
