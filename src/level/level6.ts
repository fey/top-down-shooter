import { MAP_HEIGHT, MAP_WIDTH } from "../config";
import type { LevelData } from "./level1";

export const level6: LevelData = {
  playerStart: { x: 200, y: 540 },
  walls: [
    { x: MAP_WIDTH / 2, y: 16, w: MAP_WIDTH, h: 32 },
    { x: MAP_WIDTH / 2, y: MAP_HEIGHT - 16, w: MAP_WIDTH, h: 32 },
    { x: 16, y: MAP_HEIGHT / 2, w: 32, h: MAP_HEIGHT },
    { x: MAP_WIDTH - 16, y: MAP_HEIGHT / 2, w: 32, h: MAP_HEIGHT },
    // Вертикальные колонны для укрытия
    { x: 600, y: 400, w: 32, h: 400 },
    { x: 900, y: 680, w: 32, h: 400 },
    { x: 1200, y: 400, w: 32, h: 400 },
    { x: 1500, y: 680, w: 32, h: 400 },
  ],
  enemySpawns: [
    { type: "shooter", x: 750, y: 240 },
    { type: "shooter", x: 1050, y: 840 },
    { type: "shooter", x: 1350, y: 240 },
    { type: "shooter", x: 1650, y: 840 },
  ],
};
