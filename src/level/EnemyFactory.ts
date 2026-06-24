import type Phaser from "phaser";
import type { Pathfinder } from "../ai/Pathfinder";
import type { Enemy } from "../entities/Enemy";
import { MeleeEnemy } from "../entities/MeleeEnemy";
import { ShooterEnemy } from "../entities/ShooterEnemy";
import { SmartBot } from "../entities/SmartBot";
import type { WallDef } from "../types";
import { classifySpawn } from "./spawns";

/** Зависимости, нужные врагам при спавне (группы пуль, геометрия стен, навигация). */
export interface EnemyDeps {
  enemyBullets: Phaser.Physics.Arcade.Group;
  playerBullets: Phaser.Physics.Arcade.Group;
  walls: WallDef[];
  pathfinder: Pathfinder;
}

/**
 * Создаёт врага по идентификатору спавна из Tiled-уровня и подключает pathfinder.
 * Возвращает null для неизвестных идентификаторов (включая "player_start", который
 * обрабатывается отдельно в загрузчике уровня).
 */
export function createEnemy(
  scene: Phaser.Scene,
  spawnId: string,
  x: number,
  y: number,
  deps: EnemyDeps,
): Enemy | null {
  let enemy: Enemy | null = null;
  switch (classifySpawn(spawnId)) {
    case "melee":
      enemy = new MeleeEnemy(scene, x, y, deps.walls);
      break;
    case "shooter":
      enemy = new ShooterEnemy(scene, x, y, deps.enemyBullets, deps.walls);
      break;
    case "smart":
      enemy = new SmartBot(scene, x, y, deps.enemyBullets, deps.playerBullets, deps.walls);
      break;
    default:
      // "player" обрабатывается в LevelLoader, неизвестные — игнорируются
      return null;
  }
  enemy.setPathfinder(deps.pathfinder);
  return enemy;
}
