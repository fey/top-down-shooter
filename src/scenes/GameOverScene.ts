import Phaser from "phaser";

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

    this.cameras.main.setBackgroundColor("#000000");

    this.add
      .text(width / 2, height / 2 - 40, this.win ? "ПОБЕДА" : "ПОРАЖЕНИЕ", {
        fontSize: "64px",
        color: this.win ? "#88ff88" : "#ff4444",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 + 40, "Обновите страницу для рестарта", {
        fontSize: "24px",
        color: "#aaaaaa",
      })
      .setOrigin(0.5);
  }
}
