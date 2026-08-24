import { describe, expect, it } from "vitest";
import { COLOR_HUD_HP_LOW, COLOR_TEXT, HUD_HP_LOW, PLAYER_HP } from "../config";
import { formatEnemiesLeft, formatHp, hpColor } from "./hud";

// HUD читается в бою одним взглядом: важно, что он не показывает мусора
// (отрицательное HP после смертельного удара) и что цвет меняется ровно на пороге.
describe("formatHp", () => {
  it("показывает текущее и максимальное HP", () => {
    expect(formatHp(3, 5)).toBe("HP 3 / 5");
  });

  it("зажимает отрицательное HP в ноль — смертельный удар уводит hp ниже нуля", () => {
    expect(formatHp(-2, 5)).toBe("HP 0 / 5");
  });
});

describe("formatEnemiesLeft", () => {
  it("показывает число оставшихся врагов", () => {
    expect(formatEnemiesLeft(4)).toBe("Врагов: 4");
  });

  it("зажимает отрицательное число в ноль", () => {
    expect(formatEnemiesLeft(-1)).toBe("Врагов: 0");
  });
});

describe("hpColor", () => {
  it("на полном HP цвет обычного текста", () => {
    expect(hpColor(PLAYER_HP)).toBe(COLOR_TEXT);
  });

  it("на пороге и ниже — цвет тревоги", () => {
    expect(hpColor(HUD_HP_LOW)).toBe(COLOR_HUD_HP_LOW);
    expect(hpColor(0)).toBe(COLOR_HUD_HP_LOW);
  });

  it("на единицу выше порога цвет ещё обычный — порог не «съезжает»", () => {
    expect(hpColor(HUD_HP_LOW + 1)).toBe(COLOR_TEXT);
  });
});
