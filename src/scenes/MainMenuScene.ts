import Phaser from "phaser";
import {
  COLOR_BG_MENU,
  COLOR_TEXT,
  COLOR_TEXT_MUTED,
  MENU_SUBTITLE_FONT_PX,
  MENU_TITLE_FONT_PX,
} from "../config";
import { addMenuButton } from "../ui/menuButton";
import { LEVEL_SELECT_SCENE_KEY } from "./LevelSelectScene";

export const MAIN_MENU_SCENE_KEY = "MainMenu";

/**
 * Стартовый экран — вход в игру. Нужен не для красоты: без него сцена боя начиналась
 * сразу после загрузки, и у петли «Игра → GameOver → …» не было точки, куда возвращаться.
 * Здесь же живёт справка по управлению — единственное место, где её видно до боя.
 */
export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super(MAIN_MENU_SCENE_KEY);
  }

  create(): void {
    const { width, height } = this.scale;

    this.cameras.main.setBackgroundColor(COLOR_BG_MENU);

    this.add
      .text(width / 2, height / 2 - 110, "TOP-DOWN SHOOTER", {
        fontSize: `${MENU_TITLE_FONT_PX}px`,
        color: COLOR_TEXT,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 - 50, "WASD — движение, мышь — прицел, ЛКМ — огонь", {
        fontSize: `${MENU_SUBTITLE_FONT_PX}px`,
        color: COLOR_TEXT_MUTED,
      })
      .setOrigin(0.5);

    const start = () => this.scene.start(LEVEL_SELECT_SCENE_KEY);
    addMenuButton(this, width / 2, height / 2 + 30, "Начать", start);

    this.add
      .text(width / 2, height / 2 + 100, "Enter или Space — начать", {
        fontSize: `${MENU_SUBTITLE_FONT_PX}px`,
        color: COLOR_TEXT_MUTED,
      })
      .setOrigin(0.5);

    const KC = Phaser.Input.Keyboard.KeyCodes;
    this.input.keyboard?.addKey(KC.ENTER).once("down", start);
    this.input.keyboard?.addKey(KC.SPACE).once("down", start);
  }
}
