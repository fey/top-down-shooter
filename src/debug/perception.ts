import type Phaser from "phaser";
import { ENEMY_AGGRO_RANGE, MELEE_ATTACK_RANGE, SHOOTER_RANGE } from "../config";
import type { Enemy } from "../entities/Enemy";
import { MeleeEnemy } from "../entities/MeleeEnemy";
import type { Player } from "../entities/Player";
import { ShooterEnemy } from "../entities/ShooterEnemy";

// Дебаг-цвета восприятия (стиль отрисовки, не игровой баланс — потому не в config.ts)
const AGGRO_COLOR = 0xffaa00;
const SHOOTER_RANGE_COLOR = 0x4488ff;
const MELEE_RANGE_COLOR = 0xff4444;
const LOS_VISIBLE_COLOR = 0x44ff44;
const LOS_BLOCKED_COLOR = 0x888888;

/**
 * Рисует «восприятие» врагов: круги агро/дальностей и линию LoS к игроку.
 * Не вызывает g.clear() — очистка на стороне вызывающего кода (GameScene).
 * LoS берётся из per-tick кэша врага — без повторного raycast.
 */
export function drawEnemyPerception(
  g: Phaser.GameObjects.Graphics,
  enemies: Enemy[],
  player: Player,
): void {
  for (const enemy of enemies) {
    if (!enemy.active) continue;

    g.lineStyle(1, AGGRO_COLOR, 0.3);
    g.strokeCircle(enemy.x, enemy.y, ENEMY_AGGRO_RANGE);

    if (enemy instanceof ShooterEnemy) {
      g.lineStyle(1, SHOOTER_RANGE_COLOR, 0.3);
      g.strokeCircle(enemy.x, enemy.y, SHOOTER_RANGE);
    }

    if (enemy instanceof MeleeEnemy) {
      g.lineStyle(1, MELEE_RANGE_COLOR, 0.4);
      g.strokeCircle(enemy.x, enemy.y, MELEE_ATTACK_RANGE);
    }

    if (player.active) {
      const hasLos = enemy.getLosToPlayer();
      g.lineStyle(1, hasLos ? LOS_VISIBLE_COLOR : LOS_BLOCKED_COLOR, hasLos ? 0.6 : 0.25);
      g.lineBetween(enemy.x, enemy.y, player.x, player.y);
    }
  }
}
