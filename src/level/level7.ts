import type { LevelData } from "./level1";

export const level7: LevelData = {
  width: 960,
  height: 720,
  playerStart: { x: 100, y: 360 },
  walls: [
    { x: 480, y: 16, w: 960, h: 32 },
    { x: 480, y: 704, w: 960, h: 32 },
    { x: 16, y: 360, w: 32, h: 720 },
    { x: 944, y: 360, w: 32, h: 720 },
    // L-образная стена (горизонтальная часть)
    { x: 580, y: 300, w: 340, h: 32 },
    // L-образная стена (вертикальная часть)
    { x: 734, y: 420, w: 32, h: 240 },
  ],
  enemySpawns: [
    // melee кластер — за L-стеной
    { type: "melee", x: 420, y: 360 },
    { type: "melee", x: 460, y: 420 },
    { type: "melee", x: 420, y: 470 },
    // shooter — с открытой видимостью на игрока
    { type: "shooter", x: 520, y: 220 },
    { type: "shooter", x: 680, y: 500 },
  ],
};
