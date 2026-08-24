import { COLOR_HUD_HP_LOW, COLOR_TEXT, HUD_HP_LOW } from "../config";

/**
 * Чистое ядро HUD: строки и цвета по числам состояния. Форматирование живёт здесь,
 * а не в `HUDScene`, потому что именно оно ошибкоопасно (отрицательное HP после
 * смертельного удара, «-1 враг» при рассинхроне счётчика) и покрывается тестами.
 */

/** «HP 3 / 5». Отрицательное HP (смертельный удар пробивает ноль) показывается нулём. */
export function formatHp(hp: number, maxHp: number): string {
  return `HP ${Math.max(0, hp)} / ${maxHp}`;
}

/** «Врагов: 4» — счётчик живых врагов на уровне. */
export function formatEnemiesLeft(count: number): string {
  return `Врагов: ${Math.max(0, count)}`;
}

/** Цвет счётчика HP: на пороге `HUD_HP_LOW` и ниже — тревожный, иначе обычный текст. */
export function hpColor(hp: number): string {
  return hp <= HUD_HP_LOW ? COLOR_HUD_HP_LOW : COLOR_TEXT;
}
