import Phaser from "phaser";
import type { LevelData } from "../level/level1";
import { level1 } from "../level/level1";
import { level2 } from "../level/level2";
import { GAME_SCENE_KEY } from "./GameScene";

export const LEVEL_SELECT_SCENE_KEY = "LevelSelect";

const LEVELS: Array<{ label: string; data: LevelData }> = [
  { label: "1 — Боевой (враги)", data: level1 },
  { label: "2 — Пустой (только игрок)", data: level2 },
];

export class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super(LEVEL_SELECT_SCENE_KEY);
  }

  create(): void {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor("#111111");

    this.add
      .text(width / 2, height / 2 - 80, "Выберите уровень", {
        fontSize: "36px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    LEVELS.forEach(({ label, data }, i) => {
      const y = height / 2 + i * 60;
      const btn = this.add
        .text(width / 2, y, label, {
          fontSize: "28px",
          color: "#aaffaa",
          backgroundColor: "#223322",
          padding: { x: 20, y: 10 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });

      btn.on("pointerover", () => btn.setStyle({ color: "#ffffff" }));
      btn.on("pointerout", () => btn.setStyle({ color: "#aaffaa" }));
      btn.on("pointerdown", () => this.scene.start(GAME_SCENE_KEY, { level: data }));
    });

    const key1 = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
    const key2 = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
    key1?.once("down", () => this.scene.start(GAME_SCENE_KEY, { level: LEVELS[0]?.data }));
    key2?.once("down", () => this.scene.start(GAME_SCENE_KEY, { level: LEVELS[1]?.data }));
  }
}
