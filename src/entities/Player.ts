import Phaser from "phaser";
import { PLAYER_HP, PLAYER_SPEED } from "../config";

type CursorKeys = {
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
};

export class Player extends Phaser.Physics.Arcade.Sprite {
  private keys: CursorKeys;
  hp: number;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "player");
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    this.setTint(0x00ff88);
    this.hp = PLAYER_HP;

    const keyboard = scene.input.keyboard;
    if (!keyboard) throw new Error("Keyboard plugin unavailable");
    this.keys = keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as CursorKeys;
  }

  takeDamage(amount: number): void {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.destroy();
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
    const angle = Phaser.Math.Angle.Between(this.x, this.y, pointer.worldX, pointer.worldY);
    this.setRotation(angle + Math.PI / 2);
  }
}
