import Phaser from "phaser";
import type { LevelData } from "../level/level1";
import { level1 } from "../level/level1";
import { level2 } from "../level/level2";
import { level3 } from "../level/level3";
import { level4 } from "../level/level4";
import { level5 } from "../level/level5";
import { level6 } from "../level/level6";
import { level7 } from "../level/level7";
import { GAME_SCENE_KEY } from "./GameScene";

export const LEVEL_SELECT_SCENE_KEY = "LevelSelect";

const LEVELS: Array<{ label: string; data: LevelData }> = [
  { label: "1 — Боевой (враги)", data: level1 },
  { label: "2 — Solo Melee", data: level2 },
  { label: "3 — Solo Shooter", data: level3 },
  { label: "4 — Pathfinding Maze", data: level4 },
  { label: "5 — Melee Dojo", data: level5 },
  { label: "6 — Shooter Range", data: level6 },
  { label: "7 — Mixed Pack", data: level7 },
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

    LEVELS.forEach(({ label, data }, i) => {
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
      btn.on("pointerdown", () => this.scene.start(GAME_SCENE_KEY, { level: data }));
    });

    const KC = Phaser.Input.Keyboard.KeyCodes;
    const keyCodes = [KC.ONE, KC.TWO, KC.THREE, KC.FOUR, KC.FIVE, KC.SIX, KC.SEVEN];
    keyCodes.forEach((code, i) => {
      this.input.keyboard
        ?.addKey(code)
        .once("down", () => this.scene.start(GAME_SCENE_KEY, { level: LEVELS[i]?.data }));
    });
  }
}
