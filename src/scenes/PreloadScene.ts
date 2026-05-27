import Phaser from "phaser";
import { LEVEL_SELECT_SCENE_KEY } from "./LevelSelectScene";

export const PRELOAD_SCENE_KEY = "Preload";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(PRELOAD_SCENE_KEY);
  }

  preload(): void {
    // Kenney Top-Down Shooter tilesheet (64×64 tiles, 27 columns × 20 rows)
    this.load.image("tiles-kenney", "assets/tiles/tilesheet_complete.png");

    // Level 1 Tiled map (user creates this in Tiled and exports as JSON)
    this.load.tilemapTiledJSON("level1-map", "assets/maps/level1.json");
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

    gfx.clear();
    gfx.fillStyle(0x4444ff, 1).fillRect(0, 0, 32, 32);
    gfx.generateTexture("enemy_shooter", 32, 32);

    gfx.destroy();

    this.scene.start(LEVEL_SELECT_SCENE_KEY);
  }
}
