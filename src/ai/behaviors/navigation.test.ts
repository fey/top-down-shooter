import { describe, expect, it } from "vitest";
import { stuckDecision } from "./navigation";

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
