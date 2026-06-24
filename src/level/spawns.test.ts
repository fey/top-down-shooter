import { describe, expect, it } from "vitest";
import { classifySpawn, type TileLike, tileToWall } from "./spawns";

describe("classifySpawn", () => {
  it("распознаёт все известные идентификаторы", () => {
    expect(classifySpawn("player_start")).toBe("player");
    expect(classifySpawn("melee")).toBe("melee");
    expect(classifySpawn("shooter")).toBe("shooter");
    expect(classifySpawn("smart")).toBe("smart");
  });

  it("неизвестный идентификатор → null", () => {
    expect(classifySpawn("dragon")).toBeNull();
    expect(classifySpawn("")).toBeNull();
  });
});

describe("tileToWall", () => {
  const tile = (index: number): TileLike => ({
    index,
    pixelX: 128,
    pixelY: 64,
    width: 64,
    height: 64,
  });

  it("пустой тайл (index === -1) → null", () => {
    expect(tileToWall(tile(-1))).toBeNull();
  });

  it("заполненный тайл → стена с центром в середине тайла", () => {
    expect(tileToWall(tile(5))).toEqual({ x: 160, y: 96, w: 64, h: 64 });
  });
});
