import { isWeaponId, type WeaponId } from "../config";
import type { WallDef } from "../types";

/**
 * Phaser-free парсинг данных уровня из Tiled. Чистые функции — тестируются без движка.
 * Phaser-обход слоёв/объектов остаётся в LevelLoader, здесь только трансформации данных.
 */

/** Тип точки спавна из слоя "spawns". null — неизвестный идентификатор. */
export type SpawnKind = "player" | "melee" | "shooter" | "smart" | "pickup";

/**
 * Таблица идентификаторов слоя "spawns". Таблица, а не switch, чтобы список допустимых
 * значений можно было показать автору карты в предупреждении и он не разъехался с разбором.
 */
const SPAWN_KIND_BY_ID: Record<string, SpawnKind | undefined> = {
  player_start: "player",
  melee: "melee",
  shooter: "shooter",
  smart: "smart",
  weapon_pickup: "pickup",
};

/** Идентификаторы, которые понимает загрузчик уровня — для диагностики битой карты. */
export const KNOWN_SPAWN_IDS = Object.keys(SPAWN_KIND_BY_ID);

/** Сопоставляет идентификатор спавна (Tiled type/name) с типом сущности. */
export function classifySpawn(spawnId: string): SpawnKind | null {
  return SPAWN_KIND_BY_ID[spawnId] ?? null;
}

/** Минимум полей пользовательского свойства объекта Tiled. */
export interface TiledProperty {
  name: string;
  value: unknown;
}

/**
 * Читает оружие пикапа из свойства "weapon" объекта Tiled. Какое именно оружие лежит в
 * пикапе — данные уровня, а не тип спавна, поэтому это отдельная функция от `classifySpawn`.
 * Возвращает null на отсутствующем, нестроковом или неизвестном реестру значении: битые
 * данные карты не должны валить загрузку уровня.
 */
export function readPickupWeaponId(properties: TiledProperty[] | undefined): WeaponId | null {
  if (!Array.isArray(properties)) return null; // Phaser типизирует properties как any
  const prop = properties.find((p) => p.name === "weapon");
  if (typeof prop?.value !== "string") return null;
  return isWeaponId(prop.value) ? prop.value : null;
}

/** Минимум полей тайла Tiled, нужных для построения стены (структурно совместим с Phaser.Tilemaps.Tile). */
export interface TileLike {
  index: number;
  pixelX: number;
  pixelY: number;
  width: number;
  height: number;
}

/**
 * Превращает тайл в прямоугольник стены (центр + полные размеры) или null для
 * пустого тайла (index === -1). Tiled хранит pixelX/Y как левый-верхний угол.
 */
export function tileToWall(tile: TileLike): WallDef | null {
  if (tile.index === -1) return null;
  return {
    x: tile.pixelX + tile.width / 2,
    y: tile.pixelY + tile.height / 2,
    w: tile.width,
    h: tile.height,
  };
}
