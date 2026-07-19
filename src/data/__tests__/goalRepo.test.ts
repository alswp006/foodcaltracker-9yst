import { describe, it, expect, beforeEach } from "vitest";
import { goalRepo } from "@/data/goalRepo";

const validGoal = {
  dailyKcal: 2000,
  goalType: "maintain" as const,
  carbRatio: 50,
  proteinRatio: 30,
  fatRatio: 20,
  updatedAt: 0,
};

describe("goalRepo", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns null when nothing is saved", () => {
    expect(goalRepo.get()).toBeNull();
  });

  it("rejects non-integer dailyKcal", () => {
    expect(() => goalRepo.save({ ...validGoal, dailyKcal: 2000.5 })).toThrow();
  });

  it("saves a valid goal and overwrites updatedAt", () => {
    const saved = goalRepo.save({ ...validGoal, updatedAt: 1 });
    expect(saved.updatedAt).toBeGreaterThan(1);
    expect(goalRepo.get()).toEqual(saved);
  });

  it("rejects ratio sums under 100", () => {
    expect(() =>
      goalRepo.save({ ...validGoal, carbRatio: 40, proteinRatio: 30, fatRatio: 20 })
    ).toThrow();
  });
});
