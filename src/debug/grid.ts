import type Phaser from "phaser";
import type { Pathfinder } from "../ai/Pathfinder";
import { PATH_CELL_SIZE } from "../config";

const GRID_LINE_COLOR = 0xffffff;
const BLOCKED_CELL_COLOR = 0xff0000;

/**
 * Рисует статичную сетку pathfinding (шаг PATH_CELL_SIZE = размер тайла)
 * с подсветкой заблокированных ячеек — включая паддинг вокруг стен,
 * который Pathfinder добавляет, чтобы враги не тёрлись об углы.
 * Сетка не меняется в течение уровня, поэтому рисуется один раз при создании сцены.
 */
export function drawPathGrid(
  g: Phaser.GameObjects.Graphics,
  pathfinder: Pathfinder,
  mapW: number,
  mapH: number,
): void {
  const cols = Math.ceil(mapW / PATH_CELL_SIZE);
  const rows = Math.ceil(mapH / PATH_CELL_SIZE);

  g.fillStyle(BLOCKED_CELL_COLOR, 0.15);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (!pathfinder.isWalkable(col, row)) {
        g.fillRect(col * PATH_CELL_SIZE, row * PATH_CELL_SIZE, PATH_CELL_SIZE, PATH_CELL_SIZE);
      }
    }
  }

  g.lineStyle(1, GRID_LINE_COLOR, 0.12);
  for (let col = 0; col <= cols; col++) {
    g.lineBetween(col * PATH_CELL_SIZE, 0, col * PATH_CELL_SIZE, mapH);
  }
  for (let row = 0; row <= rows; row++) {
    g.lineBetween(0, row * PATH_CELL_SIZE, mapW, row * PATH_CELL_SIZE);
  }
}
