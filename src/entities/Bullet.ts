import Phaser from "phaser";
import { BULLET_TTL } from "../config";
import type { BulletSpec } from "../weapons/Weapon";

export class Bullet extends Phaser.Physics.Arcade.Sprite {
  /** Урон задаёт стрелок при спавне: у дробинки он тот же, что у одиночной пули. */
  readonly damage: number;
  /**
   * Точка выстрела — где стрелок стоял в момент спавна пули. Нужна врагам: услышав
   * выстрел, они идут туда, откуда стреляли, а не к самой пуле (та в момент попадания
   * находится ровно на них). Имя не origin* — так в Phaser называется точка привязки
   * спрайта, и поля базового класса перекрывать нельзя.
   */
  readonly firedFromX: number;
  readonly firedFromY: number;
  private ttlTimer: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene, x: number, y: number, damage: number) {
    super(scene, x, y, "bullet");
    this.damage = damage;
    this.firedFromX = x;
    this.firedFromY = y;
    scene.add.existing(this);
    this.ttlTimer = scene.time.addEvent({
      delay: BULLET_TTL,
      callback: () => {
        if (this.active) this.destroy();
      },
    });
  }

  override destroy(fromScene?: boolean): void {
    this.ttlTimer?.remove(false);
    super.destroy(fromScene);
  }
}

/**
 * Адаптер выстрела: спецификации пуль → пули в мире. Единственное место, где выстрел
 * становится объектами сцены, поэтому порядок шагов (создать, добавить в группу, задать
 * скорость) существует в одном экземпляре, а не по копии на каждого стрелка.
 *
 * Живёт рядом с `Bullet`, а не в `weapons/`: там нет ни одного файла, знающего про Phaser,
 * и это правило закреплено линтером.
 */
export function spawnBullets(
  group: Phaser.Physics.Arcade.Group,
  specs: readonly BulletSpec[],
): void {
  for (const spec of specs) {
    const bullet = new Bullet(group.scene, spec.x, spec.y, spec.damage);
    group.add(bullet);
    bullet.setVelocity(Math.cos(spec.angle) * spec.speed, Math.sin(spec.angle) * spec.speed);
  }
}
