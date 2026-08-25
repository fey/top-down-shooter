import Phaser from "phaser";
import {
  COLOR_TEXT_MUTED,
  HUD_ENEMIES_FONT_PX,
  HUD_HP_FONT_PX,
  HUD_LINE_GAP,
  HUD_MARGIN,
  HUD_WEAPON_FONT_PX,
} from "../config";
import { ENEMIES_CHANGED, HP_CHANGED, offGameEvent, onGameEvent, WEAPON_CHANGED } from "../events";
import { formatEnemiesLeft, formatHp, hpColor } from "../ui/hud";

export const HUD_SCENE_KEY = "HUD";

/**
 * Начальный снимок состояния плюс эмиттер, через который приходят обновления.
 * Эмиттер передаётся данными запуска (`scene.launch`), а не берётся из `scene.get(...)`:
 * HUD не должен знать про экземпляр `GameScene` — только про поток её событий.
 */
export interface HudInitData {
  events: Phaser.Events.EventEmitter;
  hp: number;
  maxHp: number;
  weaponName: string;
  enemiesLeft: number;
}

/**
 * Оверлей поверх боя: HP, название оружия, счётчик живых врагов.
 *
 * Отдельная сцена, а не текст внутри `GameScene`, по двум причинам: у неё своя камера,
 * которая не двигается за игроком (иначе каждому надписи нужен `setScrollFactor(0)`),
 * и она не участвует в физике и рестартах боя — `GameScene` можно перезапускать, не
 * пересобирая HUD руками.
 */
export class HUDScene extends Phaser.Scene {
  private hpText!: Phaser.GameObjects.Text;
  private weaponText!: Phaser.GameObjects.Text;
  private enemiesText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: HUD_SCENE_KEY, active: false });
  }

  create(data: HudInitData): void {
    const { width, height } = this.scale;

    // HP и оружие — левый низ: взгляд игрока там же, где персонаж и его ствол.
    this.hpText = this.add
      .text(HUD_MARGIN, height - HUD_MARGIN, "", {
        fontSize: `${HUD_HP_FONT_PX}px`,
      })
      .setOrigin(0, 1);

    this.weaponText = this.add
      .text(HUD_MARGIN, height - HUD_MARGIN - HUD_HP_FONT_PX - HUD_LINE_GAP, "", {
        fontSize: `${HUD_WEAPON_FONT_PX}px`,
        color: COLOR_TEXT_MUTED,
      })
      .setOrigin(0, 1);

    // Счётчик врагов — правый верх: слева сверху в dev-сборке стоит дебаг-оверлей.
    this.enemiesText = this.add
      .text(width - HUD_MARGIN, HUD_MARGIN, "", {
        fontSize: `${HUD_ENEMIES_FONT_PX}px`,
        color: COLOR_TEXT_MUTED,
      })
      .setOrigin(1, 0);

    this.setHp(data.hp, data.maxHp);
    this.weaponText.setText(data.weaponName);
    this.enemiesText.setText(formatEnemiesLeft(data.enemiesLeft));

    const src = data.events;
    const onHp = (hp: number) => this.setHp(hp, data.maxHp);
    const onWeapon = (name: string) => this.weaponText.setText(name);
    const onEnemies = (count: number) => this.enemiesText.setText(formatEnemiesLeft(count));

    onGameEvent(src, HP_CHANGED, onHp);
    onGameEvent(src, WEAPON_CHANGED, onWeapon);
    onGameEvent(src, ENEMIES_CHANGED, onEnemies);

    // Эмиттер принадлежит GameScene и переживает её рестарт — подписки надо снимать
    // самим, иначе после перезапуска боя обработчики стреляют в уничтоженные надписи.
    this.events.once("shutdown", () => {
      offGameEvent(src, HP_CHANGED, onHp);
      offGameEvent(src, WEAPON_CHANGED, onWeapon);
      offGameEvent(src, ENEMIES_CHANGED, onEnemies);
    });
  }

  private setHp(hp: number, maxHp: number): void {
    this.hpText.setText(formatHp(hp, maxHp)).setColor(hpColor(hp));
  }
}
