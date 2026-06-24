import Phaser from "phaser";
import { BULLET_SPRITE_H, BULLET_SPRITE_W, COLOR_BULLET } from "../config";
import { LEVELS } from "../level/levels";
import { LEVEL_SELECT_SCENE_KEY } from "./LevelSelectScene";

export const PRELOAD_SCENE_KEY = "Preload";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(PRELOAD_SCENE_KEY);
  }

  preload(): void {
    // Kenney Top-Down Shooter tilesheet (64×64 tiles, 27 columns × 20 rows)
    this.load.image("tiles-kenney", "assets/tiles/tilesheet_complete.png");

    // Load all levels from the central registry — add new levels in src/level/levels.ts
    for (const { config } of LEVELS) {
      this.load.tilemapTiledJSON(config.key, `assets/maps/${config.key}.json`);
    }

    // Kenney Top-Down Shooter character sprites (face east at rotation 0)
    this.load.image("player", "assets/sprites/player.png");
    this.load.image("enemy_melee", "assets/sprites/enemy_melee.png");
    this.load.image("enemy_shooter", "assets/sprites/enemy_shooter.png");
  }

  create(): void {
    const gfx = this.add.graphics();

    // Для пули нет подходящего ассета Kenney — оставляем генерацию
    gfx.fillStyle(COLOR_BULLET, 1).fillRect(0, 0, BULLET_SPRITE_W, BULLET_SPRITE_H);
    gfx.generateTexture("bullet", BULLET_SPRITE_W, BULLET_SPRITE_H);

    gfx.destroy();

    this.scene.start(LEVEL_SELECT_SCENE_KEY);
  }
}
