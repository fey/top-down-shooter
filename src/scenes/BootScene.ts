import Phaser from "phaser";
import { PRELOAD_SCENE_KEY } from "./PreloadScene";

export const BOOT_SCENE_KEY = "Boot";

export class BootScene extends Phaser.Scene {
  constructor() {
    super(BOOT_SCENE_KEY);
  }

  create(): void {
    this.scene.start(PRELOAD_SCENE_KEY);
  }
}
