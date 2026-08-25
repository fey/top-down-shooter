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

export type LevelEntry = { label: string; config: LevelConfig };

/**
 * Тип — непустой кортеж, а не Array: он и есть обещание, что первый уровень существует.
 * На нём держится DEFAULT_LEVEL, а значит и то, что удаление всех записей сломает
 * typecheck, а не игру в рантайме.
 */
export const LEVELS: [LevelEntry, ...LevelEntry[]] = [
  { label: "1 — Уровень 1", config: { key: "level1" } },
  { label: "2 — Квадрат в центре", config: { key: "level2" } },
  { label: "Small test", config: { key: "level3" } },
];

/**
 * Уровень по умолчанию: единственный ответ на вопрос «а если сцену запустили без данных».
 * Строковый литерал в дефолте GameScene был опечаткой ("level1-map"), которую не ловил ни
 * typecheck, ни тесты: карта не находилась, LevelLoader уходил в пустую арену без врагов,
 * а значит и без условия победы.
 */
export const DEFAULT_LEVEL: LevelConfig = LEVELS[0].config;
