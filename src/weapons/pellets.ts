/**
 * Phaser-free ядро оружия: раскладка веера дробинок по углам.
 * Одна пуля или N — решает дескриптор оружия, а не класс-наследник.
 */

/**
 * Равномерный веер `pelletCount` углов, центрированный на `baseAngle` и покрывающий
 * ровно `spreadRad` от крайней левой до крайней правой дробинки (т.е. ±spreadRad/2).
 * При `pelletCount <= 1` — одиночный выстрел точно по прицелу.
 */
export function computePelletAngles(
  baseAngle: number,
  pelletCount: number,
  spreadRad: number,
): number[] {
  if (pelletCount <= 1) return [baseAngle];

  const step = spreadRad / (pelletCount - 1);
  const start = baseAngle - spreadRad / 2;
  const angles: number[] = [];
  for (let i = 0; i < pelletCount; i++) {
    angles.push(start + step * i);
  }
  return angles;
}
