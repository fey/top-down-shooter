import { MAP_HEIGHT, MAP_WIDTH } from "../config";
import type { LevelData } from "./level1";

export const level4: LevelData = {
  playerStart: { x: 200, y: 540 },
  walls: [
    { x: MAP_WIDTH / 2, y: 16, w: MAP_WIDTH, h: 32 },
    { x: MAP_WIDTH / 2, y: MAP_HEIGHT - 16, w: MAP_WIDTH, h: 32 },
    { x: 16, y: MAP_HEIGHT / 2, w: 32, h: MAP_HEIGHT },
    { x: MAP_WIDTH - 16, y: MAP_HEIGHT / 2, w: 32, h: MAP_HEIGHT },
    // Перегородка 1 (x=448): зазор сверху y=32–232
    { x: 448, y: 640, w: 32, h: 816 },
    // Перегородка 2 (x=832): зазор снизу y=848–1048
    { x: 832, y: 440, w: 32, h: 816 },
    // Перегородка 3 (x=1216): зазор сверху y=32–232
    { x: 1216, y: 640, w: 32, h: 816 },
    // Перегородка 4 (x=1600): зазор снизу y=848–1048
    { x: 1600, y: 440, w: 32, h: 816 },
  ],
  enemySpawns: [
    { type: "melee", x: 640, y: 540 },
    { type: "melee", x: 1024, y: 540 },
    { type: "melee", x: 1408, y: 540 },
    { type: "melee", x: 1744, y: 540 },
  ],
};
