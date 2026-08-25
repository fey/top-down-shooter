import { describe, expect, it } from "vitest";
import { SMART_BOT_AIM_SPREAD_RAD, WEAPONS } from "../config";
import { jitterAngle } from "./accuracy";

const AIM = 0.7;
const CONE = 0.2;

describe("jitterAngle", () => {
  it("розыгрыш в центре конуса не уводит прицел", () => {
    expect(jitterAngle(AIM, CONE, 0)).toBeCloseTo(AIM);
  });

  it("края розыгрыша дают ровно половину конуса в каждую сторону", () => {
    // coneRad — ПОЛНЫЙ угол: от края до края ровно coneRad, а не 2 × coneRad.
    expect(jitterAngle(AIM, CONE, 1)).toBeCloseTo(AIM + CONE / 2);
    expect(jitterAngle(AIM, CONE, -1)).toBeCloseTo(AIM - CONE / 2);
  });

  it("кривой генератор не расширяет конус за паспортный", () => {
    expect(jitterAngle(AIM, CONE, 17)).toBeCloseTo(AIM + CONE / 2);
    expect(jitterAngle(AIM, CONE, -17)).toBeCloseTo(AIM - CONE / 2);
  });

  it("нулевой конус означает идеальную точность при любом розыгрыше", () => {
    expect(jitterAngle(AIM, 0, 1)).toBeCloseTo(AIM);
    expect(jitterAngle(AIM, 0, -1)).toBeCloseTo(AIM);
  });

  it("разброс стрелка и неточность оружия мерятся одной единицей", () => {
    // Инвариант ценен именно так: обе константы прогоняются через один и тот же
    // код, поэтому «полный конус» не может разойтись между стволом и стрелком.
    expect(jitterAngle(0, SMART_BOT_AIM_SPREAD_RAD, 1)).toBeCloseTo(SMART_BOT_AIM_SPREAD_RAD / 2);
    expect(jitterAngle(0, WEAPONS.automat.aimSpreadRad, 1)).toBeCloseTo(
      WEAPONS.automat.aimSpreadRad / 2,
    );
  });
});
