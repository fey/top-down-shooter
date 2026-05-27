import type { LevelData } from "./level1";

export const level5: LevelData = {
  width: 960,
  height: 720,
  playerStart: { x: 100, y: 360 },
  walls: [
    { x: 480, y: 16, w: 960, h: 32 },
    { x: 480, y: 704, w: 960, h: 32 },
    { x: 16, y: 360, w: 32, h: 720 },
    { x: 944, y: 360, w: 32, h: 720 },
    // 4 квадратных колонны
    { x: 350, y: 240, w: 64, h: 64 },
    { x: 600, y: 240, w: 64, h: 64 },
    { x: 350, y: 480, w: 64, h: 64 },
    { x: 600, y: 480, w: 64, h: 64 },
  ],
  enemySpawns: [
    { type: "melee", x: 480, y: 130 },
    { type: "melee", x: 680, y: 180 },
    { type: "melee", x: 830, y: 260 },
    { type: "melee", x: 880, y: 360 },
    { type: "melee", x: 830, y: 460 },
    { type: "melee", x: 680, y: 540 },
  ],
};
