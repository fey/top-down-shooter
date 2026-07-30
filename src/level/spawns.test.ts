import { describe, expect, it } from "vitest";
import { classifySpawn, readPickupWeaponId, type TileLike, tileToWall } from "./spawns";

describe("classifySpawn", () => {
  it("распознаёт все известные идентификаторы", () => {
    expect(classifySpawn("player_start")).toBe("player");
    expect(classifySpawn("melee")).toBe("melee");
    expect(classifySpawn("shooter")).toBe("shooter");
    expect(classifySpawn("smart")).toBe("smart");
    expect(classifySpawn("weapon_pickup")).toBe("pickup");
  });

  it("неизвестный идентификатор → null", () => {
    expect(classifySpawn("dragon")).toBeNull();
    expect(classifySpawn("")).toBeNull();
  });
});

describe("readPickupWeaponId", () => {
  it("читает id оружия из свойства weapon", () => {
    expect(readPickupWeaponId([{ name: "weapon", value: "shotgun" }])).toBe("shotgun");
    expect(readPickupWeaponId([{ name: "weapon", value: "pistol" }])).toBe("pistol");
  });

  it("игнорирует посторонние свойства", () => {
    const props = [
      { name: "note", value: "shotgun" },
      { name: "weapon", value: "shotgun" },
    ];
    expect(readPickupWeaponId(props)).toBe("shotgun");
  });

  it("нет свойства weapon → null", () => {
    expect(readPickupWeaponId([])).toBeNull();
    expect(readPickupWeaponId(undefined)).toBeNull();
    expect(readPickupWeaponId([{ name: "hp", value: 3 }])).toBeNull();
  });

  it("неизвестное или нестроковое оружие → null (данные уровня не ломают игру)", () => {
    expect(readPickupWeaponId([{ name: "weapon", value: "railgun" }])).toBeNull();
    expect(readPickupWeaponId([{ name: "weapon", value: 42 }])).toBeNull();
  });

  it("не массив (тип properties у Phaser — any) → null, а не падение", () => {
    // Phaser объявляет TiledObject.properties как any; если форма изменится — тихо игнорируем
    expect(readPickupWeaponId({ weapon: "shotgun" } as never)).toBeNull();
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
