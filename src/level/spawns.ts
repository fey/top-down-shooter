import { isWeaponId, type WeaponId } from "../config";
import type { WallDef } from "../types";

/**
 * Phaser-free парсинг данных уровня из Tiled. Чистые функции — тестируются без движка.
 * Phaser-обход слоёв/объектов остаётся в LevelLoader, здесь только трансформации данных.
 */

/** Тип точки спавна из слоя "spawns". null — неизвестный идентификатор. */
export type SpawnKind = "player" | "melee" | "shooter" | "smart" | "pickup";

/** Сопоставляет идентификатор спавна (Tiled type/name) с типом сущности. */
export function classifySpawn(spawnId: string): SpawnKind | null {
  switch (spawnId) {
    case "player_start":
      return "player";
    case "melee":
      return "melee";
    case "shooter":
      return "shooter";
    case "smart":
      return "smart";
    case "weapon_pickup":
      return "pickup";
    default:
      return null;
  }
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
