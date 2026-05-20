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

    gfx.clear();
    gfx.fillStyle(0xffff88, 1).fillRect(0, 0, 8, 4);
    gfx.generateTexture("bullet", 8, 4);

    gfx.clear();
    gfx.fillStyle(0xff4444, 1).fillRect(0, 0, 32, 32);
    gfx.generateTexture("enemy_melee", 32, 32);

    gfx.destroy();

    this.scene.start("Game");
  }
}
