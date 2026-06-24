import type { WallDef } from "../types";

/**
 * Phaser-free геометрия видимости. Чистые функции — тестируются без движка.
 * Заменяют Phaser.Geom.Intersects.LineToRectangle в проверках LoS.
 */

/**
 * Пересекает ли отрезок (ax,ay)→(bx,by) осепараллельный прямоугольник [minX,maxX]×[minY,maxY].
 * Алгоритм Лианга–Барски: true, если есть общий параметр t∈[0,1] (включая случай,
 * когда конец отрезка лежит внутри прямоугольника).
 */
export function segmentIntersectsRect(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): boolean {
  const dx = bx - ax;
  const dy = by - ay;
  let t0 = 0;
  let t1 = 1;

  // Каждая граница ограничивает параметрический интервал [t0,t1]; пустой → нет пересечения.
  const clip = (p: number, q: number): boolean => {
    if (p === 0) return q >= 0; // параллельно границе: проходит, только если не вне неё
    const r = q / p;
    if (p < 0) {
      if (r > t1) return false;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return false;
      if (r < t1) t1 = r;
    }
    return true;
  };

  if (!clip(-dx, ax - minX)) return false;
  if (!clip(dx, maxX - ax)) return false;
  if (!clip(-dy, ay - minY)) return false;
  if (!clip(dy, maxY - ay)) return false;
  return true;
}

/** Пересекает ли отрезок прямоугольную стену (центр + полные размеры). */
export function segmentIntersectsWall(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  wall: WallDef,
): boolean {
  return segmentIntersectsRect(
    ax,
    ay,
    bx,
    by,
    wall.x - wall.w / 2,
    wall.y - wall.h / 2,
    wall.x + wall.w / 2,
    wall.y + wall.h / 2,
  );
}

/** true, если хотя бы одна стена перекрывает отрезок (ax,ay)→(bx,by). */
export function anyWallBlocks(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  walls: WallDef[],
): boolean {
  for (const wall of walls) {
    if (segmentIntersectsWall(ax, ay, bx, by, wall)) return true;
  }
  return false;
}
