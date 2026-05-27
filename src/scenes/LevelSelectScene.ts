import Phaser from "phaser";
import { GAME_SCENE_KEY, type LevelConfig } from "./GameScene";

export const LEVEL_SELECT_SCENE_KEY = "LevelSelect";

// Add new levels here after creating them in Tiled and registering in PreloadScene.
// See docs/how-to-add-level.md for step-by-step instructions.
const LEVELS: Array<{ label: string; config: LevelConfig }> = [
  { label: "1 — Уровень 1", config: { key: "level1-map" } },
];

export class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super(LEVEL_SELECT_SCENE_KEY);
  }

  create(): void {
    const { width, height } = this.scale;
    const BUTTON_SPACING = 56;
    const startY = height / 2 - ((LEVELS.length - 1) / 2) * BUTTON_SPACING;

    this.cameras.main.setBackgroundColor("#111111");

    this.add
      .text(width / 2, startY - 70, "Выберите уровень", {
        fontSize: "36px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    LEVELS.forEach(({ label, config }, i) => {
      const y = startY + i * BUTTON_SPACING;
      const btn = this.add
        .text(width / 2, y, label, {
          fontSize: "26px",
          color: "#aaffaa",
          backgroundColor: "#223322",
          padding: { x: 20, y: 8 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      btn.on("pointerover", () => btn.setStyle({ color: "#ffffff" }));
      btn.on("pointerout", () => btn.setStyle({ color: "#aaffaa" }));
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
