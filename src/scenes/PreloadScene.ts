import Phaser from "phaser";
import {
  type BarrelDef,
  BULLET_SPRITE_H,
  BULLET_SPRITE_W,
  COLOR_BARREL,
  COLOR_BULLET,
  COLOR_MELEE_BODY,
  COLOR_PICKUP_FRAME,
  COLOR_PLAYER_BODY,
  COLOR_SHOOTER_BODY,
  COLOR_SMART_BODY,
  ENEMY_BODY_RADIUS,
  INDICATOR_BARREL_LENGTH,
  INDICATOR_BARREL_WIDTH,
  PICKUP_FRAME_WIDTH,
  PICKUP_SIZE,
  PLAYER_BODY_RADIUS,
  pickupTextureKey,
  playerTextureKey,
  WEAPONS,
} from "../config";
import { LEVELS } from "../level/levels";
import { LEVEL_SELECT_SCENE_KEY } from "./LevelSelectScene";

export const PRELOAD_SCENE_KEY = "Preload";

/** Ствол врагов-стрелков: их оружие не data-driven, индикатор один на всех. */
const ENEMY_BARREL: BarrelDef = {
  length: INDICATOR_BARREL_LENGTH,
  width: INDICATOR_BARREL_WIDTH,
  color: COLOR_BARREL,
};

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
    // У игрока — по текстуре на оружие: силуэт ствола и есть индикатор экипировки.
    for (const def of Object.values(WEAPONS)) {
      this.makeEntityTexture(
        gfx,
        playerTextureKey(def),
        PLAYER_BODY_RADIUS,
        COLOR_PLAYER_BODY,
        def.barrel,
      );
      this.makePickupTexture(gfx, pickupTextureKey(def), def.barrel.color);
    }
    this.makeEntityTexture(gfx, "enemy_melee", ENEMY_BODY_RADIUS, COLOR_MELEE_BODY, null);
    this.makeEntityTexture(
      gfx,
      "enemy_shooter",
      ENEMY_BODY_RADIUS,
      COLOR_SHOOTER_BODY,
      ENEMY_BARREL,
    );
    this.makeEntityTexture(gfx, "enemy_smart", ENEMY_BODY_RADIUS, COLOR_SMART_BODY, ENEMY_BARREL);

    gfx.destroy();

    this.scene.start(LEVEL_SELECT_SCENE_KEY);
  }

  /**
   * Генерирует текстуру сущности: круг радиуса `radius` цвета `bodyColor` в центре,
   * плюс ствол-индикатор вдоль +X по дескриптору `barrel` (null — без ствола).
   * Круг всегда в центре текстуры, чтобы поворот спрайта и круговое тело (`setCircle`)
   * совпадали. Текстура симметрична по X (padding слева), поэтому origin (0.5,0.5) =
   * центр круга = ось вращения. Из-за этого размер текстуры зависит от длины ствола —
   * потребители после смены текстуры пересчитывают тело (см. `Player.equip`).
   */
  private makeEntityTexture(
    gfx: Phaser.GameObjects.Graphics,
    key: string,
    radius: number,
    bodyColor: number,
    barrel: BarrelDef | null,
  ): void {
    gfx.clear();
    const reach = radius + (barrel?.length ?? 0);
    const w = reach * 2;
    const h = radius * 2;
    const cx = reach; // центр круга по X (= центр текстуры)
    const cy = radius; // центр круга по Y
    if (barrel) {
      gfx.fillStyle(barrel.color, 1).fillRect(cx, cy - barrel.width / 2, reach, barrel.width);
    }
    gfx.fillStyle(bodyColor, 1).fillCircle(cx, cy, radius);
    gfx.generateTexture(key, w, h);
    gfx.clear();
  }

  /**
   * Текстура пикапа оружия: светлая рамка с заливкой цветом ствола этого оружия. Цвет
   * берётся из того же `barrel`, что и текстура игрока — подобранное оружие узнаётся
   * по стволу, менять палитру в двух местах не нужно.
   */
  private makePickupTexture(
    gfx: Phaser.GameObjects.Graphics,
    key: string,
    fillColor: number,
  ): void {
    gfx.clear();
    const s = PICKUP_SIZE;
    const f = PICKUP_FRAME_WIDTH;
    gfx.fillStyle(COLOR_PICKUP_FRAME, 1).fillRect(0, 0, s, s);
    gfx.fillStyle(fillColor, 1).fillRect(f, f, s - f * 2, s - f * 2);
    gfx.generateTexture(key, s, s);
    gfx.clear();
  }
}
