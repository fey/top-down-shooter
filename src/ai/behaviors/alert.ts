/**
 * Агро от чужой стрельбы: Phaser-free ядро.
 *
 * Враг узнаёт о противнике не только глазами (это делает связка ENEMY_AGGRO_RANGE + LoS
 * в tick), но и по стрельбе рядом. Здесь считается только геометрия «пуля прошла близко»;
 * что делать с результатом — дело сущности.
 */

/** Точка на карте. */
export interface Point {
  x: number;
  y: number;
}

/** Снимок пули: где она сейчас и откуда её выпустили. */
export interface BulletTrace extends Point {
  firedFromX: number;
  firedFromY: number;
}

/**
 * Источник выстрела ближайшей пули, прошедшей от точки (ex, ey) ближе `radius`.
 * `null` — рядом не пролетело ничего.
 *
 * Возвращается именно точка выстрела, а не позиция пули: враг слышит, откуда стреляли,
 * и идёт туда. Позиция пули в момент попадания совпадает с самим врагом и никуда бы его
 * не привела.
 */
export function whizzSource(
  bullets: readonly BulletTrace[],
  ex: number,
  ey: number,
  radius: number,
): Point | null {
  let best: BulletTrace | null = null;
  let bestDistSq = radius * radius;
  for (const b of bullets) {
    const dx = b.x - ex;
    const dy = b.y - ey;
    const distSq = dx * dx + dy * dy;
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      best = b;
    }
  }
  return best === null ? null : { x: best.firedFromX, y: best.firedFromY };
}
