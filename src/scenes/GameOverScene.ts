import Phaser from "phaser";
import { COLOR_BG_GAMEOVER, COLOR_LOSE, COLOR_TEXT_MUTED, COLOR_WIN } from "../config";

export const GAME_OVER_SCENE_KEY = "GameOver";

export class GameOverScene extends Phaser.Scene {
  private win = false;

  constructor() {
    super(GAME_OVER_SCENE_KEY);
  }

  init(data: { win: boolean }): void {
    this.win = data.win ?? false;
  }

  create(): void {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor(COLOR_BG_GAMEOVER);

    this.add
      .text(width / 2, height / 2 - 40, this.win ? "ПОБЕДА" : "ПОРАЖЕНИЕ", {
        fontSize: "64px",
        color: this.win ? COLOR_WIN : COLOR_LOSE,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 40, "Обновите страницу для рестарта", {
        fontSize: "24px",
        color: COLOR_TEXT_MUTED,
      })
      .setOrigin(0.5);
  }
}
