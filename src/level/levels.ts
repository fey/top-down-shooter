/**
 * Central registry of all game levels.
 *
 * To add a new level:
 *   1. Export the Tiled map as JSON to public/assets/maps/<key>.json
 *   2. Add an entry to LEVELS below — PreloadScene and LevelSelectScene
 *      pick it up automatically.
 */

/** Name of the level — used as Phaser cache key and as the JSON filename. */
export type LevelConfig = { key: string };

export const LEVELS: Array<{ label: string; config: LevelConfig }> = [
  { label: "1 — Уровень 1", config: { key: "level1" } },
  { label: "2 — Квадрат в центре", config: { key: "level2" } },
];
