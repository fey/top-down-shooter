import type { WeaponDef } from "../config";
import { computePelletAngles } from "./pellets";

/**
 * Спецификация одной пули: всё, что нужно, чтобы она появилась в мире. Выстрел из
 * дробовика даёт пять таких, из пистолета — одну.
 *
 * Числа абсолютные, а не «дескриптор плюс угол»: тогда адаптер спавна ничего не
 * вычисляет, а урон и скорость каждой дробинки попадают под тест.
 */
export interface BulletSpec {
  x: number;
  y: number;
  angle: number;
  speed: number;
  damage: number;
}

/**
 * Оружие, управляемое дескриптором (`WEAPONS` в config.ts): темп, скорость пули, веер и
 * неточность — данные, а не подклассы.
 *
 * Phaser-free: выстрел возвращает спецификации пуль, а не создаёт объекты сцены. Пули в
 * мир кладёт `spawnBullets` (`entities/Bullet.ts`) — единственный адаптер на всех стрелков.
 * Поэтому весь класс, включая темп и розыгрыш неточности, покрывается unit-тестами.
 */
export class Weapon {
  private readonly def: WeaponDef;
  /**
   * Источник случайности инъецируется: неточность — единственное, что делает выстрел
   * неповторимым, и тест обязан ею управлять. Ядро само `Math.random` не зовёт.
   */
  private readonly rng: () => number;
  private lastFired = 0;

  constructor(def: WeaponDef, rng: () => number = Math.random) {
    this.def = def;
    this.rng = rng;
  }

  /**
   * Выстрел: темп, затем неточность, затем веер. Возвращает по спецификации на дробинку;
   * **пустой массив — темп не пустил**, отдельного признака «не выстрелил» нет.
   *
   * Окно темпа сдвигается только на состоявшемся выстреле: зажатая кнопка не отодвигает
   * следующий выстрел бесконечно.
   */
  tryFire(x: number, y: number, angle: number, now: number): BulletSpec[] {
    if (now - this.lastFired < this.def.cooldown) return [];
    this.lastFired = now;

    const { pelletCount, spreadRad, aimSpreadRad, bulletSpeed, damage } = this.def;

    // Неточность разыгрывается один раз на выстрел и уводит ствол ДО раскладки веера:
    // дробь одного патрона летит связным конусом, а не вразброд.
    const aim = angle + (this.roll() * aimSpreadRad) / 2;

    return computePelletAngles(aim, pelletCount, spreadRad).map((pelletAngle) => ({
      x,
      y,
      angle: pelletAngle,
      speed: bulletSpeed,
      damage,
    }));
  }

  /**
   * Розыгрыш неточности в диапазоне [-1, 1]. Значения за пределами обрезаются, чтобы
   * кривой генератор не расширял конус за паспортный.
   */
  private roll(): number {
    return Math.max(-1, Math.min(1, this.rng() * 2 - 1));
  }
}
