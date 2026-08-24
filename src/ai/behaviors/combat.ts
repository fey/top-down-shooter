import type { Vec2 } from "../grid";

/**
 * Чистые боевые решения врагов — Phaser-free, тестируются без движка.
 * Оболочки (tick() сущностей) собирают снимок (позиции/скорости/дистанция),
 * вызывают эти функции и применяют результат через физику Phaser.
 */

export type KiteAction = "retreat" | "advance" | "strafe";

/**
 * Поддержание боевой дистанции: ближе retreatDist — отступать, дальше advanceDist —
 * сближаться, между — стрейф. Порядок проверок задаёт приоритет.
 */
export function kiteAction(dist: number, retreatDist: number, advanceDist: number): KiteAction {
  if (dist < retreatDist) return "retreat";
  if (dist > advanceDist) return "advance";
  return "strafe";
}

/**
 * Угол прицела с линейным упреждением: целимся в позицию, где цель окажется через
 * время полёта пули t = dist / bulletSpeed. Возвращает угол (рад) от стрелка к точке упреждения.
 */
export function predictAimAngle(
  self: Vec2,
  target: Vec2,
  targetVel: Vec2,
  bulletSpeed: number,
  dist: number,
): number {
  const t = dist / bulletSpeed;
  const aimX = target.x + targetVel.x * t;
  const aimY = target.y + targetVel.y * t;
  return Math.atan2(aimY - self.y, aimX - self.x);
}

export interface DodgeParams {
  /** Дистанция, ближе которой летящая пуля вообще рассматривается как угроза. */
  dodgeRadius: number;
  /** Макс. боковое отклонение траектории пули от тела, при котором она угрожает. */
  lateralThreshold: number;
  /** Скорость рывка уклонения. */
  speed: number;
}

/**
 * Оценивает одну пулю как угрозу и, если она летит в стрелка, возвращает вектор
 * скорости рывка вбок (перпендикулярно курсу пули, в сторону уже имеющегося смещения).
 * null — пуля не угрожает (стоит, удаляется, летит мимо или слишком далеко).
 */
export function evaluateDodge(
  self: Vec2,
  bulletPos: Vec2,
  bulletVel: Vec2,
  params: DodgeParams,
): Vec2 | null {
  const speed = Math.hypot(bulletVel.x, bulletVel.y);
  if (speed < 1) return null;

  const toSelfX = self.x - bulletPos.x;
  const toSelfY = self.y - bulletPos.y;
  if (Math.hypot(toSelfX, toSelfY) > params.dodgeRadius) return null;

  const nvx = bulletVel.x / speed;
  const nvy = bulletVel.y / speed;
  // Пуля должна приближаться (двигаться в сторону цели).
  if (toSelfX * nvx + toSelfY * nvy <= 0) return null;
  // Боковое отклонение траектории от тела: |cross(toSelf, nv)|.
  const lateral = Math.abs(toSelfX * nvy - toSelfY * nvx);
  if (lateral > params.lateralThreshold) return null;

  // Уходим перпендикулярно курсу пули, в ту сторону, где тело уже смещено.
  let perpX = -nvy;
  let perpY = nvx;
  if (toSelfX * perpX + toSelfY * perpY < 0) {
    perpX = -perpX;
    perpY = -perpY;
  }
  return { x: perpX * params.speed, y: perpY * params.speed };
}
