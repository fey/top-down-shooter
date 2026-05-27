import { MAP_HEIGHT, MAP_WIDTH } from "../config";
import type { LevelData } from "./level1";

export const level5: LevelData = {
  playerStart: { x: 200, y: 540 },
  walls: [
    { x: MAP_WIDTH / 2, y: 16, w: MAP_WIDTH, h: 32 },
    { x: MAP_WIDTH / 2, y: MAP_HEIGHT - 16, w: MAP_WIDTH, h: 32 },
    { x: 16, y: MAP_HEIGHT / 2, w: 32, h: MAP_HEIGHT },
    { x: MAP_WIDTH - 16, y: MAP_HEIGHT / 2, w: 32, h: MAP_HEIGHT },
    // 4 квадратных колонны
    { x: 700, y: 350, w: 96, h: 96 },
    { x: 1100, y: 350, w: 96, h: 96 },
    { x: 700, y: 730, w: 96, h: 96 },
    { x: 1100, y: 730, w: 96, h: 96 },
  ],
  enemySpawns: [
    { type: "melee", x: 900, y: 200 },
    { type: "melee", x: 1300, y: 300 },
    { type: "melee", x: 1600, y: 400 },
    { type: "melee", x: 1700, y: 540 },
    { type: "melee", x: 1600, y: 680 },
    { type: "melee", x: 1300, y: 780 },
  ],
};
