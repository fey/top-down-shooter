import { describe, expect, it } from "vitest";
import {
  PLAYER_SPEED,
  SHOOTER_KITE_ADVANCE_DIST,
  SHOOTER_KITE_RETREAT_DIST,
  SHOOTER_RANGE,
  SMART_BOT_HP,
  SMART_BOT_KITE_ADVANCE_DIST,
  SMART_BOT_KITE_RETREAT_DIST,
  SMART_BOT_LOW_HP,
  SMART_BOT_SPEED,
  WEAPONS,
} from "./config";

// Инварианты баланса: соотношения, которые легко молча сломать правкой config.ts.
// Это не «тесты значений», а защита смысловых зависимостей между параметрами.
describe("баланс врагов-стрелков", () => {
  it("зона кайтинга охватывает дистанцию стрельбы: retreat < range < advance", () => {
    expect(SHOOTER_KITE_RETREAT_DIST).toBeLessThan(SHOOTER_RANGE);
    expect(SHOOTER_RANGE).toBeLessThan(SHOOTER_KITE_ADVANCE_DIST);
  });

  it("границы кайтинга соответствуют задокументированным долям range (75% / 115%)", () => {
    // Константы — округлённые приближения долей, допускаем ±2 px.
    expect(Math.abs(SHOOTER_KITE_RETREAT_DIST - SHOOTER_RANGE * 0.75)).toBeLessThanOrEqual(2);
    expect(Math.abs(SHOOTER_KITE_ADVANCE_DIST - SHOOTER_RANGE * 1.15)).toBeLessThanOrEqual(2);
  });
});

describe("баланс SmartBot", () => {
  it("равен игроку по подвижности (соперник уровня игрока)", () => {
    expect(SMART_BOT_SPEED).toBe(PLAYER_SPEED);
  });

  it("отступает раньше, чем сближается", () => {
    expect(SMART_BOT_KITE_RETREAT_DIST).toBeLessThan(SMART_BOT_KITE_ADVANCE_DIST);
  });

  it("порог ухода в укрытие ниже полного HP (иначе прячется сразу)", () => {
    expect(SMART_BOT_LOW_HP).toBeGreaterThan(0);
    expect(SMART_BOT_LOW_HP).toBeLessThan(SMART_BOT_HP);
  });
});

describe("реестр оружия", () => {
  const weapons = Object.values(WEAPONS);

  it("глифы уникальны — иначе пикапы разных пушек неразличимы", () => {
    const glyphs = weapons.map((w) => w.glyph);
    expect(new Set(glyphs).size).toBe(glyphs.length);
  });

  it("у каждого оружия непустой глиф в один символ", () => {
    for (const w of weapons) {
      expect(w.glyph.length, `оружие ${w.id}`).toBe(1);
    }
  });
});
