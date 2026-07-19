import { describe, it, expect } from "vitest";
import { aggregateDaily, aggregateWeekly, calcGoalProgress, calcMacroRatio } from "@/domain/report/aggregate";
import type { MealRecord, UserGoal } from "@/lib/types";

function makeRecord(overrides: Partial<MealRecord> = {}): MealRecord {
  return {
    id: "id-1",
    date: "2026-07-20",
    createdAt: 0,
    mealType: "breakfast",
    foodName: "김밥",
    source: "manual",
    amountGram: 200,
    kcal: 300,
    carbG: 40,
    proteinG: 10,
    fatG: 8,
    aiGenerated: false,
    edited: false,
    ...overrides,
  };
}

describe("aggregateDaily", () => {
  it("AC-1: returns all zeros for an empty array without throwing", () => {
    const result = aggregateDaily([], "2026-07-20");
    expect(result.dailyKcal).toBe(0);
    expect(result.dailyCarbG).toBe(0);
    expect(result.dailyProteinG).toBe(0);
    expect(result.dailyFatG).toBe(0);
    expect(result.byMealType.breakfast).toEqual({ kcal: 0, carbG: 0, proteinG: 0, fatG: 0 });
  });

  it("sums a single record into totals and its mealType bucket", () => {
    const result = aggregateDaily([makeRecord()], "2026-07-20");
    expect(result.dailyKcal).toBe(300);
    expect(result.byMealType.breakfast.kcal).toBe(300);
    expect(result.byMealType.lunch.kcal).toBe(0);
  });

  it("sums multiple meals per mealType and ignores records from other dates", () => {
    const records = [
      makeRecord({ id: "a", mealType: "lunch", kcal: 500, carbG: 60, proteinG: 20, fatG: 15 }),
      makeRecord({ id: "b", mealType: "lunch", kcal: 200, carbG: 20, proteinG: 5, fatG: 5 }),
      makeRecord({ id: "c", date: "2026-07-19", mealType: "dinner", kcal: 999 }),
    ];
    const result = aggregateDaily(records, "2026-07-20");
    expect(result.dailyKcal).toBe(700);
    expect(result.byMealType.lunch).toEqual({ kcal: 700, carbG: 80, proteinG: 25, fatG: 20 });
    expect(result.byMealType.dinner).toEqual({ kcal: 0, carbG: 0, proteinG: 0, fatG: 0 });
  });
});

describe("aggregateWeekly", () => {
  it("AC-2: always returns length 7 for an empty array, zero-filled", () => {
    const result = aggregateWeekly([], "2026-07-20");
    expect(result).toHaveLength(7);
    result.forEach((entry) => {
      expect(entry.dailyKcal).toBe(0);
      expect(entry.dailyCarbG).toBe(0);
    });
  });

  it("AC-2: returns dates in KST ascending order ending at endDate (7-day boundary)", () => {
    const result = aggregateWeekly([], "2026-07-20");
    expect(result.map((e) => e.date)).toEqual([
      "2026-07-14",
      "2026-07-15",
      "2026-07-16",
      "2026-07-17",
      "2026-07-18",
      "2026-07-19",
      "2026-07-20",
    ]);
  });

  it("AC-2: includes days with zero records while aggregating days that have records", () => {
    const records = [
      makeRecord({ date: "2026-07-20", kcal: 400 }),
      makeRecord({ date: "2026-07-14", kcal: 100 }),
    ];
    const result = aggregateWeekly(records, "2026-07-20");
    expect(result).toHaveLength(7);
    expect(result[0].date).toBe("2026-07-14");
    expect(result[0].dailyKcal).toBe(100);
    expect(result[6].date).toBe("2026-07-20");
    expect(result[6].dailyKcal).toBe(400);
    expect(result[3].dailyKcal).toBe(0);
  });

  it("crosses a month boundary correctly", () => {
    const result = aggregateWeekly([], "2026-08-02");
    expect(result.map((e) => e.date)).toEqual([
      "2026-07-27",
      "2026-07-28",
      "2026-07-29",
      "2026-07-30",
      "2026-07-31",
      "2026-08-01",
      "2026-08-02",
    ]);
  });
});

describe("calcGoalProgress", () => {
  const dailySum = aggregateDaily([makeRecord({ kcal: 1000 })], "2026-07-20");

  it("AC-3: returns 0/0 when goal is undefined", () => {
    const result = calcGoalProgress(dailySum, undefined);
    expect(result).toEqual({ percentage: 0, remainingKcal: 0 });
  });

  it("AC-3: returns 0/0 when goal is null", () => {
    const result = calcGoalProgress(dailySum, null);
    expect(result).toEqual({ percentage: 0, remainingKcal: 0 });
  });

  it("AC-3: returns 0/0 when goal.dailyKcal is 0 (no NaN/Infinity)", () => {
    const goal: UserGoal = {
      dailyKcal: 0,
      goalType: "maintain",
      carbRatio: 50,
      proteinRatio: 30,
      fatRatio: 20,
      updatedAt: 0,
    };
    const result = calcGoalProgress(dailySum, goal);
    expect(result).toEqual({ percentage: 0, remainingKcal: 0 });
    expect(Number.isFinite(result.percentage)).toBe(true);
  });

  it("computes percentage (x1000 scale) and remaining kcal against a normal goal", () => {
    const goal: UserGoal = {
      dailyKcal: 2000,
      goalType: "maintain",
      carbRatio: 50,
      proteinRatio: 30,
      fatRatio: 20,
      updatedAt: 0,
    };
    const result = calcGoalProgress(dailySum, goal);
    expect(result.percentage).toBe(500); // 1000 / 2000 * 1000
    expect(result.remainingKcal).toBe(1000);
  });

  it("allows exceeding goal without clamping, remainingKcal goes negative", () => {
    const overSum = aggregateDaily([makeRecord({ kcal: 2500 })], "2026-07-20");
    const goal: UserGoal = {
      dailyKcal: 2000,
      goalType: "gain",
      carbRatio: 50,
      proteinRatio: 30,
      fatRatio: 20,
      updatedAt: 0,
    };
    const result = calcGoalProgress(overSum, goal);
    expect(result.percentage).toBe(1250); // 2500 / 2000 * 1000
    expect(result.remainingKcal).toBe(-500);
  });
});

describe("calcMacroRatio", () => {
  it("AC-4: guards the dailyKcal denominator against zero (no NaN/Infinity)", () => {
    const result = calcMacroRatio({ dailyKcal: 0, dailyCarbG: 0, dailyProteinG: 0, dailyFatG: 0 });
    expect(result).toEqual({ carbRatio: 0, proteinRatio: 0, fatRatio: 0 });
    expect(Number.isNaN(result.carbRatio)).toBe(false);
    expect(Number.isFinite(result.carbRatio)).toBe(true);
  });

  it("computes carb/protein/fat ratio as % of total daily kcal", () => {
    const result = calcMacroRatio({ dailyKcal: 2000, dailyCarbG: 250, dailyProteinG: 150, dailyFatG: 55.6 });
    expect(result.carbRatio).toBe(50); // 250*4 / 2000 * 100
    expect(result.proteinRatio).toBe(30); // 150*4 / 2000 * 100
    expect(result.fatRatio).toBe(25); // 55.6*9 / 2000 * 100 (rounded)
  });
});
