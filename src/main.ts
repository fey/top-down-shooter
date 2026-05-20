import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { GameScene } from "./scenes/GameScene";
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
  scene: [BootScene, PreloadScene, GameScene],
});
