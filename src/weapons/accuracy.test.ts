import { describe, expect, it } from "vitest";
import { jitterAngle } from "./accuracy";

describe("jitterAngle", () => {
  it("нулевой розыгрыш — выстрел точно по прицелу", () => {
    expect(jitterAngle(1.2, 0.2, 0)).toBeCloseTo(1.2);
  });

  it("крайние розыгрыши уводят на половину конуса в каждую сторону", () => {
    expect(jitterAngle(0, 0.2, 1)).toBeCloseTo(0.1);
    expect(jitterAngle(0, 0.2, -1)).toBeCloseTo(-0.1);
  });

  it("точное оружие не отклоняется ни при каком розыгрыше", () => {
    for (const roll of [-1, -0.3, 0, 0.7, 1]) {
      expect(jitterAngle(2.5, 0, roll)).toBeCloseTo(2.5);
    }
  });

  it("отклонение пропорционально розыгрышу", () => {
    expect(jitterAngle(0, 0.4, 0.5)).toBeCloseTo(0.1);
    expect(jitterAngle(0, 0.4, -0.25)).toBeCloseTo(-0.05);
  });

  it("розыгрыш за пределами [-1, 1] обрезается — конус не расширяется", () => {
    expect(jitterAngle(0, 0.2, 5)).toBeCloseTo(0.1);
    expect(jitterAngle(0, 0.2, -5)).toBeCloseTo(-0.1);
  });
});
