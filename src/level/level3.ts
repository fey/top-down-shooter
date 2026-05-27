import { MAP_HEIGHT, MAP_WIDTH } from "../config";
import type { LevelData } from "./level1";

export const level3: LevelData = {
  playerStart: { x: 200, y: 540 },
  walls: [
    { x: MAP_WIDTH / 2, y: 16, w: MAP_WIDTH, h: 32 },
    { x: MAP_WIDTH / 2, y: MAP_HEIGHT - 16, w: MAP_WIDTH, h: 32 },
    { x: 16, y: MAP_HEIGHT / 2, w: 32, h: MAP_HEIGHT },
    { x: MAP_WIDTH - 16, y: MAP_HEIGHT / 2, w: 32, h: MAP_HEIGHT },
    // Вертикальный пилон 1 — блокирует LoS при y≈540
    { x: 700, y: 450, w: 32, h: 300 },
    // Вертикальный пилон 2 — дополнительное укрытие
    { x: 1100, y: 630, w: 32, h: 300 },
  ],
  enemySpawns: [{ type: "shooter", x: 1600, y: 540 }],
};
