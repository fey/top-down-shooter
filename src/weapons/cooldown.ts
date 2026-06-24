/**
 * Чистый предикат готовности оружия к выстрелу. Phaser-free — тестируется без движка.
 * Выстрел разрешён, если с последнего прошло не меньше cooldown мс.
 */
export function canFire(now: number, lastFired: number, cooldown: number): boolean {
  return now - lastFired >= cooldown;
}
