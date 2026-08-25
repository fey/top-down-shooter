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

/** Снимок восприятия, которого достаточно для выбора цели преследования. */
export interface ChaseSnapshot {
  /** Виден ли игрок прямо сейчас. */
  hasLos: boolean;
  /** Заполнена ли последняя известная позиция игрока. */
  hasLastKnown: boolean;
}

export interface ChaseDecision {
  target: ChaseNavTarget;
  /** lastKnownPos пуст — оболочка должна взять туда текущую позицию игрока. */
  adoptPlayerAsLastKnown: boolean;
}

/**
 * Решение навигации в CHASE, общее для `MeleeEnemy` и `ShooterEnemy` (`SmartBot` приходит
 * к тому же поведению своим путём — без LoS он уходит в enterSearch()).
 *
 * Смысл в первой строке: без видимости враг идёт к последней известной точке, а не к
 * игроку. Иначе агро от выстрела из-за угла выдавало бы врагу знание, которого у него нет
 * (см. docs/spec.md, «Агро от стрельбы»).
 *
 * `hasLastKnown` ложно, когда агро пришло тревогой (`packAlert` ставит CHASE, но точки не
 * даёт) — тогда точкой становится текущая позиция игрока, иначе враг пошёл бы в (0, 0).
 *
 * Пересчёта пути здесь нет намеренно: маршрут инвалидирует `PathFollower` по смене вида
 * цели, а вид меняется ровно на том же фронте видимости.
 */
export function chaseDecision(snapshot: ChaseSnapshot): ChaseDecision {
  if (snapshot.hasLos) return { target: "player", adoptPlayerAsLastKnown: false };
  return { target: "lastKnown", adoptPlayerAsLastKnown: !snapshot.hasLastKnown };
}
