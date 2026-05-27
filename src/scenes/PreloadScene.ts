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

    // Kenney Top-Down Shooter character sprites (face east at rotation 0)
    this.load.image("player", "assets/sprites/player.png");
    this.load.image("enemy_melee", "assets/sprites/enemy_melee.png");
    this.load.image("enemy_shooter", "assets/sprites/enemy_shooter.png");
  }

  create(): void {
    const gfx = this.add.graphics();

    // Для пули нет подходящего ассета Kenney — оставляем генерацию
    gfx.fillStyle(0xffff88, 1).fillRect(0, 0, 8, 4);
    gfx.generateTexture("bullet", 8, 4);

    gfx.destroy();

    this.scene.start(LEVEL_SELECT_SCENE_KEY);
  }
}
