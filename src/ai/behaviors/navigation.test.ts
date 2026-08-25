import { describe, expect, it } from "vitest";
import { chaseDecision, stuckDecision } from "./navigation";

describe("stuckDecision", () => {
  const threshold = 6;

  it("достаточный сдвиг → progress, стадия сбрасывается в 0", () => {
    expect(stuckDecision(10, 0, threshold)).toEqual({ action: "progress", nextStage: 0 });
    expect(stuckDecision(10, 1, threshold)).toEqual({ action: "progress", nextStage: 0 });
  });

  it("сдвиг ровно на порог считается прогрессом (>=)", () => {
    expect(stuckDecision(threshold, 1, threshold)).toEqual({ action: "progress", nextStage: 0 });
  });

  it("застрял на стадии 0 → skip, переход на стадию 1", () => {
    expect(stuckDecision(2, 0, threshold)).toEqual({ action: "skip", nextStage: 1 });
  });

  it("застрял на стадии 1 → repath, возврат на стадию 0", () => {
    expect(stuckDecision(2, 1, threshold)).toEqual({ action: "repath", nextStage: 0 });
  });
});

describe("chaseDecision", () => {
  it("есть видимость — идём на самого игрока", () => {
    expect(chaseDecision({ hasLos: true, hasLastKnown: true })).toEqual({
      target: "player",
      adoptPlayerAsLastKnown: false,
    });
  });

  it("нет видимости — идём к последней известной точке, а не к игроку", () => {
    // Контракт агро от стрельбы: враг знает направление выстрела, но не позицию стрелка.
    expect(chaseDecision({ hasLos: false, hasLastKnown: true }).target).toBe("lastKnown");
  });

  it("агро без видимости и без запомненной точки — взять текущую позицию игрока", () => {
    // Так поднимает тревога (packAlert): состояние CHASE есть, lastKnownPos пуст —
    // без подмены враг пошёл бы навигироваться в (0, 0).
    const d = chaseDecision({ hasLos: false, hasLastKnown: false });
    expect(d.adoptPlayerAsLastKnown).toBe(true);
    expect(d.target).toBe("lastKnown");
  });

  it("при видимости запомненная точка не нужна и не подменяется", () => {
    expect(chaseDecision({ hasLos: true, hasLastKnown: false }).adoptPlayerAsLastKnown).toBe(false);
  });
});
