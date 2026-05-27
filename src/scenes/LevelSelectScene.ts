import Phaser from "phaser";
import { level2 } from "../level/level2";
import { level3 } from "../level/level3";
import { level4 } from "../level/level4";
import { level5 } from "../level/level5";
import { level6 } from "../level/level6";
import { level7 } from "../level/level7";
import { GAME_SCENE_KEY, type LevelConfig } from "./GameScene";

export const LEVEL_SELECT_SCENE_KEY = "LevelSelect";

const LEVELS: Array<{ label: string; config: LevelConfig }> = [
  { label: "1 — Боевой (враги)", config: { mode: "tilemap", key: "level1-map" } },
  { label: "2 — Solo Melee", config: { mode: "data", data: level2 } },
  { label: "3 — Solo Shooter", config: { mode: "data", data: level3 } },
  { label: "4 — Pathfinding Maze", config: { mode: "data", data: level4 } },
  { label: "5 — Melee Dojo", config: { mode: "data", data: level5 } },
  { label: "6 — Shooter Range", config: { mode: "data", data: level6 } },
  { label: "7 — Mixed Pack", config: { mode: "data", data: level7 } },
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
    const keyCodes = [KC.ONE, KC.TWO, KC.THREE, KC.FOUR, KC.FIVE, KC.SIX, KC.SEVEN];
    keyCodes.forEach((code, i) => {
      this.input.keyboard
        ?.addKey(code)
        .once("down", () => this.scene.start(GAME_SCENE_KEY, { level: LEVELS[i]?.config }));
    });
  }
}
