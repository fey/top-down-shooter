import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { GameOverScene } from "./scenes/GameOverScene";
import { GameScene } from "./scenes/GameScene";
import { HUDScene } from "./scenes/HUDScene";
import { LevelSelectScene } from "./scenes/LevelSelectScene";
import { MainMenuScene } from "./scenes/MainMenuScene";
import { PreloadScene } from "./scenes/PreloadScene";

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "app",
  width: 960,
  height: 540,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  // Порядок = порядок отрисовки: HUDScene идёт после GameScene, поэтому оверлей
  // рисуется поверх боя, а не под ним.
  scene: [
    BootScene,
    PreloadScene,
    MainMenuScene,
    LevelSelectScene,
    GameScene,
    HUDScene,
    GameOverScene,
  ],
});
