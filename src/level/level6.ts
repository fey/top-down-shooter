import type { LevelData } from "./level1";

export const level6: LevelData = {
  width: 960,
  height: 720,
  playerStart: { x: 100, y: 360 },
  walls: [
    { x: 480, y: 16, w: 960, h: 32 },
    { x: 480, y: 704, w: 960, h: 32 },
    { x: 16, y: 360, w: 32, h: 720 },
    { x: 944, y: 360, w: 32, h: 720 },
    // Вертикальные колонны для укрытия (чередуются верх/низ)
    { x: 300, y: 200, w: 32, h: 268 },
    { x: 480, y: 470, w: 32, h: 268 },
    { x: 660, y: 200, w: 32, h: 268 },
    { x: 840, y: 470, w: 32, h: 268 },
  ],
  enemySpawns: [
    { type: "shooter", x: 380, y: 120 },
    { type: "shooter", x: 560, y: 560 },
    { type: "shooter", x: 740, y: 120 },
    { type: "shooter", x: 900, y: 560 },
  ],
};
