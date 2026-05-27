import { MAP_HEIGHT, MAP_WIDTH } from "../config";

export interface WallDef {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface EnemySpawn {
  type: "melee" | "shooter";
  x: number;
  y: number;
}

export interface LevelData {
  width?: number;
  height?: number;
  playerStart: { x: number; y: number };
  walls: WallDef[];
  enemySpawns: EnemySpawn[];
}

export const level1: LevelData = {
  playerStart: { x: 200, y: 200 },
  walls: [
    { x: MAP_WIDTH / 2, y: 16, w: MAP_WIDTH, h: 32 },
    { x: MAP_WIDTH / 2, y: MAP_HEIGHT - 16, w: MAP_WIDTH, h: 32 },
    { x: 16, y: MAP_HEIGHT / 2, w: 32, h: MAP_HEIGHT },
    { x: MAP_WIDTH - 16, y: MAP_HEIGHT / 2, w: 32, h: MAP_HEIGHT },
    { x: 600, y: 400, w: 200, h: 32 },
    { x: 900, y: 700, w: 32, h: 300 },
    { x: 400, y: 800, w: 400, h: 32 },
    { x: 1400, y: 300, w: 32, h: 400 },
    { x: 1200, y: 900, w: 300, h: 32 },
  ],
  enemySpawns: [
    { type: "melee", x: 600, y: 300 },
    { type: "melee", x: 1000, y: 500 },
    { type: "melee", x: 800, y: 800 },
    { type: "melee", x: 1400, y: 600 },
    { type: "shooter", x: 1550, y: 200 },
    { type: "shooter", x: 300, y: 700 },
  ],
};
