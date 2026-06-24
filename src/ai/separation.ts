import type { Vec2 } from "./grid";

/**
 * Сила отталкивания от ближних стен — Phaser-free, тестируется без движка.
 * Сэмплит 8 направлений на sampleDist; для каждой попавшей в заблокированную
 * клетку точки добавляет отталкивание от центра клетки с весом 1/dist (линейный,
 * не квадратичный — мягкое скольжение вдоль стен). Результат нормируется к strength.
 *
 * Проверку проходимости клетки даёт колбэк isWalkable(col,row) — так функция не
 * зависит ни от Phaser, ни от конкретной сетки.
 */
export function wallSeparationForce(
  x: number,
  y: number,
  sampleDist: number,
  cellSize: number,
  strength: number,
  isWalkable: (col: number, row: number) => boolean,
): Vec2 {
  let fx = 0;
  let fy = 0;

  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI) / 4;
    const sx = x + Math.cos(angle) * sampleDist;
    const sy = y + Math.sin(angle) * sampleDist;
    const col = Math.floor(sx / cellSize);
    const row = Math.floor(sy / cellSize);

    if (!isWalkable(col, row)) {
      const cellCx = col * cellSize + cellSize / 2;
      const cellCy = row * cellSize + cellSize / 2;
      const dx = x - cellCx;
      const dy = y - cellCy;
      const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      fx += (dx / dist) * (1 / dist);
      fy += (dy / dist) * (1 / dist);
    }
  }

  const lenSq = fx * fx + fy * fy;
  if (lenSq > 0) {
    const len = Math.sqrt(lenSq);
    fx = (fx / len) * strength;
    fy = (fy / len) * strength;
  }
  return { x: fx, y: fy };
}
