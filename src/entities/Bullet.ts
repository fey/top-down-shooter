import Phaser from "phaser";
import { BULLET_DAMAGE, BULLET_TTL } from "../config";

export class Bullet extends Phaser.Physics.Arcade.Sprite {
  damage = BULLET_DAMAGE;
  /**
   * Точка выстрела — где стрелок стоял в момент спавна пули. Нужна врагам: услышав
   * выстрел, они идут туда, откуда стреляли, а не к самой пуле (та в момент попадания
   * находится ровно на них). Имя не origin* — так в Phaser называется точка привязки
   * спрайта, и поля базового класса перекрывать нельзя.
   */
  readonly firedFromX: number;
  readonly firedFromY: number;
  private ttlTimer: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "bullet");
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
