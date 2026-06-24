/**
 * Чистое решение восстановления при застревании врага на маршруте — Phaser-free.
 * Применение (пропуск вейпоинта / пересчёт пути) и работа с таймерами остаются
 * в оболочке Enemy.moveAlongPath.
 */

export type StuckAction = "progress" | "skip" | "repath";

export interface StuckDecision {
  action: StuckAction;
  /** Новая стадия восстановления: 0 = норма, 1 = вейпоинт уже пропущен. */
  nextStage: number;
}

/**
 * Двухстадийное восстановление: если за окно проверки враг сдвинулся меньше порога,
 * сперва пропускаем текущий вейпоинт (стадия 0→1), при повторном застревании —
 * форсируем полный пересчёт пути (стадия 1→0). Достаточный сдвиг сбрасывает стадию.
 */
export function stuckDecision(moved: number, stage: number, moveThreshold: number): StuckDecision {
  if (moved >= moveThreshold) return { action: "progress", nextStage: 0 };
  if (stage === 0) return { action: "skip", nextStage: 1 };
  return { action: "repath", nextStage: 0 };
}
