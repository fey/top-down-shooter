import Phaser from "phaser";
import {
  BULLET_SPRITE_H,
  BULLET_SPRITE_W,
  COLOR_BARREL,
  COLOR_BULLET,
  COLOR_MELEE_BODY,
  COLOR_PLAYER_BODY,
  COLOR_SHOOTER_BODY,
  COLOR_SMART_BODY,
  ENEMY_BODY_RADIUS,
  INDICATOR_BARREL_LENGTH,
  INDICATOR_BARREL_WIDTH,
  PLAYER_BODY_RADIUS,
} from "../config";
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
  }

  create(): void {
    const gfx = this.add.graphics();

    gfx.fillStyle(COLOR_BULLET, 1).fillRect(0, 0, BULLET_SPRITE_W, BULLET_SPRITE_H);
    gfx.generateTexture("bullet", BULLET_SPRITE_W, BULLET_SPRITE_H);

    // Символьные текстуры сущностей: круг тела + опциональный ствол-индикатор.
    // Ствол показывает направление прицела (rotation=0 ⇒ восток).
    this.makeEntityTexture(gfx, "player", PLAYER_BODY_RADIUS, COLOR_PLAYER_BODY, true);
    this.makeEntityTexture(gfx, "enemy_melee", ENEMY_BODY_RADIUS, COLOR_MELEE_BODY, false);
    this.makeEntityTexture(gfx, "enemy_shooter", ENEMY_BODY_RADIUS, COLOR_SHOOTER_BODY, true);
    this.makeEntityTexture(gfx, "enemy_smart", ENEMY_BODY_RADIUS, COLOR_SMART_BODY, true);

    gfx.destroy();

    this.scene.start(LEVEL_SELECT_SCENE_KEY);
  }

  /**
   * Генерирует текстуру сущности: круг радиуса `radius` цвета `bodyColor` в центре,
   * плюс опциональный ствол-индикатор вдоль +X. Круг всегда в центре текстуры, чтобы
   * поворот спрайта и круговое тело (`setCircle`) совпадали. Текстура симметрична по X
   * (padding слева), поэтому origin (0.5,0.5) = центр круга = ось вращения.
   */
  private makeEntityTexture(
    gfx: Phaser.GameObjects.Graphics,
    key: string,
    radius: number,
    bodyColor: number,
    withBarrel: boolean,
  ): void {
    gfx.clear();
    const reach = withBarrel ? radius + INDICATOR_BARREL_LENGTH : radius;
    const w = reach * 2;
    const h = radius * 2;
    const cx = reach; // центр круга по X (= центр текстуры)
    const cy = radius; // центр круга по Y
    if (withBarrel) {
      gfx
        .fillStyle(COLOR_BARREL, 1)
        .fillRect(cx, cy - INDICATOR_BARREL_WIDTH / 2, reach, INDICATOR_BARREL_WIDTH);
    }
    gfx.fillStyle(bodyColor, 1).fillCircle(cx, cy, radius);
    gfx.generateTexture(key, w, h);
    gfx.clear();
  }
}
