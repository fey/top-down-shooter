import type Phaser from "phaser";
import {
  COLOR_DEBUG_MELEE,
  COLOR_DEBUG_SHOOTER,
  COLOR_DEBUG_SMART,
  COLOR_DEBUG_TARGET,
} from "../config";
import type { Enemy } from "../entities/Enemy";
import { MeleeEnemy } from "../entities/MeleeEnemy";
import type { Player } from "../entities/Player";
import { SmartBot } from "../entities/SmartBot";
import { drawEnemyPerception } from "./perception";

/** Половина размера крестика-метки целевой точки пути, px. */
const TARGET_CROSS = 8;

/**
 * Рисует текущие маршруты врагов (цвет по типу), целевые точки путей и линии
 * восприятия (LoS/aggro). Вызывается каждый кадр при включённом дебаге (F1).
 */
export function drawDebugPaths(
  graphics: Phaser.GameObjects.Graphics,
  enemies: Enemy[],
  player: Player,
): void {
  graphics.clear();

  for (const enemy of enemies) {
    if (!enemy.active) continue;

    const lineColor =
      enemy instanceof MeleeEnemy
        ? COLOR_DEBUG_MELEE
        : enemy instanceof SmartBot
          ? COLOR_DEBUG_SMART
          : COLOR_DEBUG_SHOOTER;
    const waypoints = enemy.getRemainingWaypoints();

    if (waypoints.length > 0) {
      graphics.lineStyle(2, lineColor, 0.8);
      graphics.beginPath();
      graphics.moveTo(enemy.x, enemy.y);
      for (const wp of waypoints) {
        graphics.lineTo(wp.x, wp.y);
      }
      graphics.strokePath();
    }

    const target = enemy.getLastPathTarget();
    if (target) {
      graphics.lineStyle(2, COLOR_DEBUG_TARGET, 0.9);
      graphics.beginPath();
      graphics.moveTo(target.x - TARGET_CROSS, target.y);
      graphics.lineTo(target.x + TARGET_CROSS, target.y);
      graphics.moveTo(target.x, target.y - TARGET_CROSS);
      graphics.lineTo(target.x, target.y + TARGET_CROSS);
      graphics.strokePath();
    }
  }

  drawEnemyPerception(graphics, enemies, player);
}
