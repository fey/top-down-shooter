import Phaser from "phaser";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super("Preload");
  }

  create(): void {
    const gfx = this.add.graphics();
    gfx.fillStyle(0xffffff, 1).fillRect(0, 0, 32, 32);
    gfx.fillStyle(0x000000, 1).fillTriangle(16, 2, 10, 14, 22, 14);
    gfx.generateTexture("player", 32, 32);
    gfx.destroy();

    this.scene.start("Game");
  }
}
