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

/** Куда навигироваться в CHASE: на самого игрока или на последнюю известную точку. */
export type ChaseNavTarget = "player" | "lastKnown";

export interface ChaseDecision {
  target: ChaseNavTarget;
  /** lastKnownPos не заполнен — оболочка должна взять туда текущую позицию игрока. */
  adoptPlayerAsLastKnown: boolean;
  /** Сбросить кэш пути: цель сменилась скачком, старый маршрут ведёт не туда. */
  repath: boolean;
}

/**
 * Решение навигации в CHASE, общее для всех преследующих врагов.
 *
 * Смысл в первой строке: без видимости враг идёт к последней известной точке, а не к
 * игроку. Иначе агро от выстрела из-за угла выдавало бы врагу знание, которого у него нет
 * (см. docs/spec.md, «Агро от стрельбы»).
 *
 * `hadLos` — видимость на прошлом тике: путь пересчитывается именно на потере видимости,
 * а не на каждом тике без неё, иначе маршрут строился бы заново каждый кадр.
 *
 * `hasLastKnown` ложно, когда агро пришло тревогой (`packAlert` ставит CHASE, но точки не
 * даёт) — тогда точкой становится текущая позиция игрока, иначе враг пошёл бы в (0, 0).
 */
export function chaseDecision(
  hasLos: boolean,
  hadLos: boolean,
  hasLastKnown: boolean,
): ChaseDecision {
  if (hasLos) return { target: "player", adoptPlayerAsLastKnown: false, repath: false };
  return {
    target: "lastKnown",
    adoptPlayerAsLastKnown: !hasLastKnown,
    repath: hadLos,
  };
}
