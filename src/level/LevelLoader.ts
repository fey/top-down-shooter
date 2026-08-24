import type Phaser from "phaser";
import { Pathfinder } from "../ai/Pathfinder";
import { MAP_HEIGHT, MAP_WIDTH } from "../config";
import { Player } from "../entities/Player";
import { WeaponPickup } from "../entities/WeaponPickup";
import type { WallDef } from "../types";
import { createEnemy } from "./EnemyFactory";
import { classifySpawn, KNOWN_SPAWN_IDS, readPickupWeaponId, tileToWall } from "./spawns";

/** Результат загрузки уровня. wallLayer === null при аварийном fallback. */
export interface LoadedLevel {
  player: Player;
  pathfinder: Pathfinder;
  wallLayer: Phaser.Tilemaps.TilemapLayer | null;
  mapW: number;
  mapH: number;
}

/** Группы, в которые загрузчик размещает игрока, врагов, их пули и пикапы. */
export interface LevelDeps {
  playerBullets: Phaser.Physics.Arcade.Group;
  enemyBullets: Phaser.Physics.Arcade.Group;
  enemyGroup: Phaser.Physics.Arcade.Group;
  pickups: Phaser.Physics.Arcade.StaticGroup;
}

/** Извлекает WallDef[] из слоя стен Tiled для проверок LoS и поиска пути. */
function extractWallsFromLayer(wallLayer: Phaser.Tilemaps.TilemapLayer): WallDef[] {
  const walls: WallDef[] = [];
  wallLayer.forEachTile((tile) => {
    const wall = tileToWall(tile);
    if (wall) walls.push(wall);
  });
  return walls;
}

/**
 * Загружает уровень из Tiled JSON-карты: слои "floor" (визуал), "walls" (коллизии),
 * "spawns" (объекты "player_start", "melee", "shooter", "smart", "weapon_pickup").
 * Создаёт игрока, врагов (в deps.enemyGroup), пикапы (в deps.pickups) и Pathfinder.
 * Навешивание коллайдеров и камеры —
 * ответственность вызывающей сцены (ей возвращается wallLayer и игрок).
 */
export function loadTiledLevel(
  scene: Phaser.Scene,
  tilemapKey: string,
  deps: LevelDeps,
): LoadedLevel {
  const map = scene.make.tilemap({ key: tilemapKey });
  const mapW = map.widthInPixels;
  const mapH = map.heightInPixels;

  scene.physics.world.setBounds(0, 0, mapW, mapH);

  const tileset = map.addTilesetImage("tilesheet_complete", "tiles-kenney");
  if (!tileset) {
    console.error("[LevelLoader] Failed to add tileset 'tilesheet_complete'");
    return fallbackLevel(scene, deps, mapW || MAP_WIDTH, mapH || MAP_HEIGHT);
  }

  // Floor layer — visual only, no collision
  map.createLayer("floor", tileset, 0, 0);

  // Wall layer — all placed tiles are solid.
  // Cast: we use the default (non-GPU) tilemap renderer throughout this project.
  const wallLayer = map.createLayer("walls", tileset, 0, 0) as Phaser.Tilemaps.TilemapLayer | null;
  if (!wallLayer) {
    console.error("[LevelLoader] No 'walls' layer found in tilemap");
    return fallbackLevel(scene, deps, mapW, mapH);
  }
  wallLayer.setCollisionByExclusion([-1]);

  // Extract geometry for LoS and pathfinding
  const walls = extractWallsFromLayer(wallLayer);
  const pathfinder = new Pathfinder(walls, mapW, mapH);

  const spawnObjects = map.getObjectLayer("spawns")?.objects ?? [];
  let player: Player | null = null;
  const enemyDeps = {
    enemyBullets: deps.enemyBullets,
    playerBullets: deps.playerBullets,
    walls,
    pathfinder,
  };

  for (const obj of spawnObjects) {
    const ox = obj.x ?? 100;
    const oy = obj.y ?? 100;
    // Tiled stores the identifier in "type" (class) OR "name" depending on workflow.
    // Support both: fall back to name when type is empty.
    const spawnId = obj.type || obj.name;

    const kind = classifySpawn(spawnId);
    if (kind === null) {
      // Объект есть на карте, но сущности из него не будет. Без предупреждения автор карты
      // узнаёт об опечатке в Class только по отсутствию врага в бою.
      console.warn(
        `[LevelLoader] Unknown spawn "${spawnId}" at (${ox}, ${oy}) — skipped; ` +
          `expected one of: ${KNOWN_SPAWN_IDS.join(", ")}`,
      );
      continue;
    }
    if (kind === "player") {
      player = new Player(scene, ox, oy, deps.playerBullets);
      continue;
    }
    if (kind === "pickup") {
      const weaponId = readPickupWeaponId(obj.properties);
      if (weaponId) {
        deps.pickups.add(new WeaponPickup(scene, ox, oy, weaponId));
      } else {
        console.warn(
          `[LevelLoader] Pickup at (${ox}, ${oy}) has no valid "weapon" property — skipped`,
        );
      }
      continue;
    }
    const enemy = createEnemy(scene, spawnId, ox, oy, enemyDeps);
    if (enemy) deps.enemyGroup.add(enemy);
  }

  if (!player) {
    console.warn(
      "[LevelLoader] No 'player_start' object in spawns layer — using fallback (100, 100)",
    );
    player = new Player(scene, 100, 100, deps.playerBullets);
  }

  return { player, pathfinder, wallLayer, mapW, mapH };
}

/** Аварийный fallback: минимальная пустая арена, когда загрузка карты не удалась. */
function fallbackLevel(
  scene: Phaser.Scene,
  deps: LevelDeps,
  mapW: number,
  mapH: number,
): LoadedLevel {
  const pathfinder = new Pathfinder([], mapW, mapH);
  const player = new Player(scene, 100, 100, deps.playerBullets);
  return { player, pathfinder, wallLayer: null, mapW, mapH };
}
