import Phaser from "phaser";
import {
  COLOR_BG_MENU,
  COLOR_MENU_BTN,
  COLOR_MENU_BTN_BG,
  COLOR_MENU_BTN_HOVER,
  COLOR_TEXT,
} from "../config";
import { LEVELS } from "../level/levels";
import { GAME_SCENE_KEY } from "./GameScene";

export const LEVEL_SELECT_SCENE_KEY = "LevelSelect";

// To add a new level — edit src/level/levels.ts only. No changes here needed.

export class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super(LEVEL_SELECT_SCENE_KEY);
  }

  create(): void {
    const { width, height } = this.scale;
    const BUTTON_SPACING = 56;
    const startY = height / 2 - ((LEVELS.length - 1) / 2) * BUTTON_SPACING;

    this.cameras.main.setBackgroundColor(COLOR_BG_MENU);

    this.add
      .text(width / 2, startY - 70, "Выберите уровень", {
        fontSize: "36px",
        color: COLOR_TEXT,
      })
      .setOrigin(0.5);

    LEVELS.forEach(({ label, config }, i) => {
      const y = startY + i * BUTTON_SPACING;
      const btn = this.add
        .text(width / 2, y, label, {
          fontSize: "26px",
          color: COLOR_MENU_BTN,
          backgroundColor: COLOR_MENU_BTN_BG,
          padding: { x: 20, y: 8 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      btn.on("pointerover", () => btn.setStyle({ color: COLOR_MENU_BTN_HOVER }));
      btn.on("pointerout", () => btn.setStyle({ color: COLOR_MENU_BTN }));
      btn.on("pointerdown", () => this.scene.start(GAME_SCENE_KEY, { level: config }));
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
  }
}
