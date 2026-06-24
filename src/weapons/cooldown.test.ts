import { describe, expect, it } from "vitest";
import { canFire } from "./cooldown";

describe("canFire", () => {
  const cooldown = 250;

  it("до истечения первого кулдауна от старта выстрел запрещён (now < cooldown)", () => {
    // Сохраняем исходное поведение: lastFired=0, now=0 → 0 - 0 < cooldown.
    expect(canFire(0, 0, cooldown)).toBe(false);
  });

  it("запрещает выстрел до истечения кулдауна", () => {
    expect(canFire(249, 0, cooldown)).toBe(false);
  });

  it("разрешает выстрел ровно на границе кулдауна", () => {
    expect(canFire(250, 0, cooldown)).toBe(true);
  });

  it("разрешает выстрел после кулдауна", () => {
    expect(canFire(1000, 700, cooldown)).toBe(true);
  });

  it("нулевой кулдаун всегда разрешает выстрел", () => {
    expect(canFire(5, 5, 0)).toBe(true);
  });
});
