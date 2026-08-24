import type Phaser from "phaser";
import {
  COLOR_MENU_BTN,
  COLOR_MENU_BTN_BG,
  COLOR_MENU_BTN_HOVER,
  MENU_BTN_FONT_PX,
} from "../config";

/**
 * Кнопка экранного меню: текст с фоном-подложкой, подсветкой под курсором и действием
 * по клику. Живёт отдельным хелпером, потому что три сцены-меню (`MainMenuScene`,
 * `LevelSelectScene`, `GameOverScene`) должны выглядеть и вести себя одинаково —
 * иначе кнопки расходятся по кеглю и цвету при первой же правке одной из них.
 */
export function addMenuButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onActivate: () => void,
): Phaser.GameObjects.Text {
  const btn = scene.add
    .text(x, y, label, {
      fontSize: `${MENU_BTN_FONT_PX}px`,
      color: COLOR_MENU_BTN,
      backgroundColor: COLOR_MENU_BTN_BG,
      padding: { x: 20, y: 8 },
    })
    .setOrigin(0.5)
    .setInteractive({ useHandCursor: true });

  btn.on("pointerover", () => btn.setStyle({ color: COLOR_MENU_BTN_HOVER }));
  btn.on("pointerout", () => btn.setStyle({ color: COLOR_MENU_BTN }));
  btn.on("pointerdown", onActivate);

  return btn;
}
