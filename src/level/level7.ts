import { MAP_HEIGHT, MAP_WIDTH } from "../config";
import type { LevelData } from "./level1";

export const level7: LevelData = {
  playerStart: { x: 200, y: 540 },
  walls: [
    { x: MAP_WIDTH / 2, y: 16, w: MAP_WIDTH, h: 32 },
    { x: MAP_WIDTH / 2, y: MAP_HEIGHT - 16, w: MAP_WIDTH, h: 32 },
    { x: 16, y: MAP_HEIGHT / 2, w: 32, h: MAP_HEIGHT },
    { x: MAP_WIDTH - 16, y: MAP_HEIGHT / 2, w: 32, h: MAP_HEIGHT },
    // L-образная стена (горизонтальная часть)
    { x: 1050, y: 480, w: 500, h: 32 },
    // L-образная стена (вертикальная часть)
    { x: 1284, y: 640, w: 32, h: 320 },
  ],
  enemySpawns: [
    // melee кластер — за L-стеной
    { type: "melee", x: 800, y: 500 },
    { type: "melee", x: 860, y: 580 },
    { type: "melee", x: 800, y: 650 },
    // shooter — с открытой видимостью на игрока
    { type: "shooter", x: 950, y: 340 },
    { type: "shooter", x: 1200, y: 700 },
  ],
};
