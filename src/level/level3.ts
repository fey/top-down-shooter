import type { LevelData } from "./level1";

export const level3: LevelData = {
  width: 960,
  height: 720,
  playerStart: { x: 100, y: 360 },
  walls: [
    { x: 480, y: 16, w: 960, h: 32 },
    { x: 480, y: 704, w: 960, h: 32 },
    { x: 16, y: 360, w: 32, h: 720 },
    { x: 944, y: 360, w: 32, h: 720 },
    // Вертикальный пилон 1 — блокирует LoS при y≈360
    { x: 380, y: 280, w: 32, h: 200 },
    // Вертикальный пилон 2 — дополнительное укрытие
    { x: 580, y: 440, w: 32, h: 200 },
  ],
  enemySpawns: [{ type: "shooter", x: 850, y: 360 }],
};
