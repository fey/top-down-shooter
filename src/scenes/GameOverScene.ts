import Phaser from "phaser";
import {
  COLOR_BG_GAMEOVER,
  COLOR_LOSE,
  COLOR_TEXT_MUTED,
  COLOR_WIN,
  MENU_BTN_SPACING,
  MENU_OUTCOME_FONT_PX,
  MENU_SUBTITLE_FONT_PX,
} from "../config";
import type { LevelConfig } from "../level/levels";
import { addMenuButton } from "../ui/menuButton";
import { GAME_SCENE_KEY } from "./GameScene";
import { MAIN_MENU_SCENE_KEY } from "./MainMenuScene";

export const GAME_OVER_SCENE_KEY = "GameOver";

/**
 * Итог боя и выход из него. `GameScene` передаёт сюда не только исход, но и конфиг
 * уровня — иначе «Заново» не знает, что перезапускать, и рестарт остаётся тем, чем
 * был до M8: перезагрузкой страницы.
 */
export class GameOverScene extends Phaser.Scene {
  private win = false;
  private level: LevelConfig | null = null;

  constructor() {
    super(GAME_OVER_SCENE_KEY);
  }

  init(data: { win?: boolean; level?: LevelConfig }): void {
    this.win = data.win ?? false;
    this.level = data.level ?? null;
  }

  create(): void {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor(COLOR_BG_GAMEOVER);

    this.add
      .text(width / 2, height / 2 - 90, this.win ? "ПОБЕДА" : "ПОРАЖЕНИЕ", {
        fontSize: `${MENU_OUTCOME_FONT_PX}px`,
        color: this.win ? COLOR_WIN : COLOR_LOSE,
      })
      .setOrigin(0.5);

    const toMenu = () => this.scene.start(MAIN_MENU_SCENE_KEY);
    const level = this.level;

    let y = height / 2 + 10;
    if (level) {
      const restart = () => this.scene.start(GAME_SCENE_KEY, { level });
      addMenuButton(this, width / 2, y, "Заново", restart);
      this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.R).once("down", restart);
      y += MENU_BTN_SPACING;
    }

    addMenuButton(this, width / 2, y, "В меню", toMenu);
    this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC).once("down", toMenu);

    this.add
      .text(width / 2, y + MENU_BTN_SPACING, level ? "R — заново, Esc — в меню" : "Esc — в меню", {
        fontSize: `${MENU_SUBTITLE_FONT_PX}px`,
        color: COLOR_TEXT_MUTED,
      })
      .setOrigin(0.5);
  }
}
