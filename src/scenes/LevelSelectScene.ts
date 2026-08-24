import Phaser from "phaser";
import {
  COLOR_BG_MENU,
  COLOR_TEXT,
  COLOR_TEXT_MUTED,
  MENU_BTN_SPACING,
  MENU_HEADING_FONT_PX,
  MENU_SUBTITLE_FONT_PX,
} from "../config";
import { LEVELS } from "../level/levels";
import { addMenuButton } from "../ui/menuButton";
import { GAME_SCENE_KEY } from "./GameScene";
import { MAIN_MENU_SCENE_KEY } from "./MainMenuScene";

export const LEVEL_SELECT_SCENE_KEY = "LevelSelect";

// To add a new level — edit src/level/levels.ts only. No changes here needed.

export class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super(LEVEL_SELECT_SCENE_KEY);
  }

  create(): void {
    const { width, height } = this.scale;
    const startY = height / 2 - ((LEVELS.length - 1) / 2) * MENU_BTN_SPACING;

    this.cameras.main.setBackgroundColor(COLOR_BG_MENU);

    this.add
      .text(width / 2, startY - 70, "Выберите уровень", {
        fontSize: `${MENU_HEADING_FONT_PX}px`,
        color: COLOR_TEXT,
      })
      .setOrigin(0.5);

    LEVELS.forEach(({ label, config }, i) => {
      const y = startY + i * MENU_BTN_SPACING;
      addMenuButton(this, width / 2, y, label, () =>
        this.scene.start(GAME_SCENE_KEY, { level: config }),
      );
    });

    const KC = Phaser.Input.Keyboard.KeyCodes;
    LEVELS.forEach(({ config }, i) => {
      const code = [
        KC.ONE,
        KC.TWO,
        KC.THREE,
        KC.FOUR,
        KC.FIVE,
        KC.SIX,
        KC.SEVEN,
        KC.EIGHT,
        KC.NINE,
      ][i];
      if (code !== undefined) {
        this.input.keyboard
          ?.addKey(code)
          .once("down", () => this.scene.start(GAME_SCENE_KEY, { level: config }));
      }
    });

    // Назад в меню — замыкает петлю: из выбора уровня можно выйти, не начиная бой.
    this.input.keyboard?.addKey(KC.ESC).once("down", () => this.scene.start(MAIN_MENU_SCENE_KEY));

    this.add
      .text(width / 2, startY + LEVELS.length * MENU_BTN_SPACING + 20, "Esc — в меню", {
        fontSize: `${MENU_SUBTITLE_FONT_PX}px`,
        color: COLOR_TEXT_MUTED,
      })
      .setOrigin(0.5);
  }
}
