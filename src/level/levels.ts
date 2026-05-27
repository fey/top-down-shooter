/**
 * Central registry of all game levels.
 *
 * To add a new level:
 *   1. Export the Tiled map as JSON to public/assets/maps/<name>.json
 *   2. Add an entry to LEVELS below — PreloadScene and LevelSelectScene
 *      pick it up automatically.
 *
 * Key naming convention: "<name>-map" → file "assets/maps/<name>.json"
 */

/** Key of a Tiled JSON tilemap loaded by PreloadScene. */
export type LevelConfig = { key: string };

export const LEVELS: Array<{ label: string; config: LevelConfig }> = [
  { label: "1 — Уровень 1", config: { key: "level1-map" } },
  { label: "2 — Квадрат в центре", config: { key: "level2-map" } },
];
