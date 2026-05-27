import type { LevelData } from "./level1";

export const level2: LevelData = {
  width: 960,
  height: 720,
  playerStart: { x: 100, y: 100 },
  walls: [
    { x: 480, y: 16, w: 960, h: 32 },
    { x: 480, y: 704, w: 960, h: 32 },
    { x: 16, y: 360, w: 32, h: 720 },
    { x: 944, y: 360, w: 32, h: 720 },
  ],
  enemySpawns: [{ type: "melee", x: 480, y: 360 }],
};
