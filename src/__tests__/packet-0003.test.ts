import { describe, it, expect, beforeEach } from "vitest";
import type { MealRecord, UserGoal } from "@/lib/types";
import { STORAGE_KEYS } from "@/lib/types";
import { safeGet } from "@/lib/storage";
import { todayKST } from "@/lib/date";

/**
 * Packet 0003: Domain Repositories — meals / goal (validation included)
 *
 * TDD RED PHASE TEST SUITE
 *
 * These tests import repositories that don't exist yet.
 * Tests WILL FAIL initially — that's intentional and expected.
 *
 * Test Coverage:
 * AC-1: All localStorage keys start with 'fct:'
 * AC-2: foodName validation (trim, 1-40 chars, not whitespace-only)
 * AC-3: Numeric validation (amountGram 1-3000, kcal 0-5000, macros 0-500)
 * AC-4: Both kcal===0 && amountGram===0 rejected
 * AC-5: Goal validation (dailyKcal 800-5000, ratios sum to 100)
 * AC-6: Corrupt JSON recovery (empty array for meals, null for goal)
 * AC-7: ID generation (crypto.randomUUID) and date (KST)
 * AC-8: CRUD operations (listByDate, listRange, add, update, remove)
 * AC-9: goalRepo get/save
 * AC-10: Reuse of 0002 utilities (no modification)
 * AC-11: No console.error, validation throws Error
 */

// Import repositories (WILL FAIL until implemented)
import { mealsRepo } from "@/data/mealsRepo";
import { goalRepo } from "@/data/goalRepo";

// ============================================================================
// MEALS REPOSITORY TESTS
// ============================================================================

describe("AC-1: All localStorage keys start with 'fct:'", () => {
  it("should use 'fct:meals' storage key", () => {
    expect(STORAGE_KEYS.meals).toBe("fct:meals");
    expect(STORAGE_KEYS.meals.startsWith("fct:")).toBe(true);
  });

  it("should use 'fct:goal' storage key", () => {
    expect(STORAGE_KEYS.goal).toBe("fct:goal");
    expect(STORAGE_KEYS.goal.startsWith("fct:")).toBe(true);
  });
});

describe("AC-2: foodName validation (trim, 1-40 chars, not whitespace-only)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should reject foodName that is whitespace-only after trim", () => {
    const input = {
      mealType: "lunch" as const,
      foodName: "   ",
      source: "manual" as const,
      amountGram: 100,
      kcal: 100,
      carbG: 10.0,
      proteinG: 10.0,
      fatG: 10.0,
      aiGenerated: false,
      edited: false,
    };

    expect(() => mealsRepo.add(input)).toThrow();
  });

  it("should reject foodName longer than 40 characters", () => {
    const input = {
      mealType: "lunch" as const,
      foodName: "a".repeat(41),
      source: "manual" as const,
      amountGram: 100,
      kcal: 100,
      carbG: 10.0,
      proteinG: 10.0,
      fatG: 10.0,
      aiGenerated: false,
      edited: false,
    };

    expect(() => mealsRepo.add(input)).toThrow();
  });

  it("should accept foodName of 1-40 characters after trim", () => {
    const input = {
      mealType: "lunch" as const,
      foodName: "  계란  ",
      source: "manual" as const,
      amountGram: 100,
      kcal: 155,
      carbG: 1.1,
      proteinG: 13.0,
      fatG: 11.0,
      aiGenerated: false,
      edited: false,
    };

    const added = mealsRepo.add(input);
    expect(added.foodName).toBe("계란");
    expect(added.foodName.length).toBeGreaterThanOrEqual(1);
    expect(added.foodName.length).toBeLessThanOrEqual(40);
  });
});

describe("AC-3: Numeric validation (amountGram, kcal, macros)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should reject amountGram < 1 or > 3000", () => {
    const input = (gram: number) => ({
      mealType: "lunch" as const,
      foodName: "음식",
      source: "manual" as const,
      amountGram: gram,
      kcal: 100,
      carbG: 10.0,
      proteinG: 10.0,
      fatG: 10.0,
      aiGenerated: false,
      edited: false,
    });

    expect(() => mealsRepo.add(input(0))).toThrow();
    expect(() => mealsRepo.add(input(3001))).toThrow();
  });

  it("should accept amountGram in range 1-3000", () => {
    const input = {
      mealType: "lunch" as const,
      foodName: "계란",
      source: "manual" as const,
      amountGram: 100,
      kcal: 155,
      carbG: 1.1,
      proteinG: 13.0,
      fatG: 11.0,
      aiGenerated: false,
      edited: false,
    };

    const added = mealsRepo.add(input);
    expect(added.amountGram).toBe(100);
  });

  it("should reject kcal > 5000 or < 0", () => {
    const input = (kcal: number) => ({
      mealType: "lunch" as const,
      foodName: "음식",
      source: "manual" as const,
      amountGram: 100,
      kcal,
      carbG: 10.0,
      proteinG: 10.0,
      fatG: 10.0,
      aiGenerated: false,
      edited: false,
    });

    expect(() => mealsRepo.add(input(-1))).toThrow();
    expect(() => mealsRepo.add(input(5001))).toThrow();
  });

  it("should round carbG/proteinG/fatG to 1 decimal place", () => {
    const input = {
      mealType: "lunch" as const,
      foodName: "계란",
      source: "manual" as const,
      amountGram: 100,
      kcal: 155,
      carbG: 1.123,
      proteinG: 13.456,
      fatG: 11.789,
      aiGenerated: false,
      edited: false,
    };

    const added = mealsRepo.add(input);
    expect(added.carbG).toBe(1.1);
    expect(added.proteinG).toBe(13.5);
    expect(added.fatG).toBe(11.8);
  });

  it("should reject macros outside 0-500 range", () => {
    const input = (carbG: number) => ({
      mealType: "lunch" as const,
      foodName: "음식",
      source: "manual" as const,
      amountGram: 100,
      kcal: 100,
      carbG,
      proteinG: 10.0,
      fatG: 10.0,
      aiGenerated: false,
      edited: false,
    });

    expect(() => mealsRepo.add(input(-0.1))).toThrow();
    expect(() => mealsRepo.add(input(500.1))).toThrow();
  });
});

describe("AC-4: Both kcal===0 && amountGram===0 rejected", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should reject when both kcal and amountGram are 0", () => {
    const input = {
      mealType: "lunch" as const,
      foodName: "음식",
      source: "manual" as const,
      amountGram: 0,
      kcal: 0,
      carbG: 0.0,
      proteinG: 0.0,
      fatG: 0.0,
      aiGenerated: false,
      edited: false,
    };

    expect(() => mealsRepo.add(input)).toThrow();
  });

  it("should accept kcal===0 if amountGram > 0", () => {
    const input = {
      mealType: "lunch" as const,
      foodName: "물",
      source: "manual" as const,
      amountGram: 200,
      kcal: 0,
      carbG: 0.0,
      proteinG: 0.0,
      fatG: 0.0,
      aiGenerated: false,
      edited: false,
    };

    const added = mealsRepo.add(input);
    expect(added.kcal).toBe(0);
    expect(added.amountGram).toBe(200);
  });
});

describe("AC-5: Goal validation (dailyKcal 800-5000, ratios sum to 100)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should reject dailyKcal < 800 or > 5000", () => {
    expect(() =>
      goalRepo.save({
        dailyKcal: 799,
        goalType: "maintain",
        carbRatio: 50,
        proteinRatio: 30,
        fatRatio: 20,
        updatedAt: Date.now(),
      })
    ).toThrow();

    expect(() =>
      goalRepo.save({
        dailyKcal: 5001,
        goalType: "maintain",
        carbRatio: 50,
        proteinRatio: 30,
        fatRatio: 20,
        updatedAt: Date.now(),
      })
    ).toThrow();
  });

  it("should accept dailyKcal in range 800-5000", () => {
    const goal: UserGoal = {
      dailyKcal: 2000,
      goalType: "maintain",
      carbRatio: 50,
      proteinRatio: 30,
      fatRatio: 20,
      updatedAt: Date.now(),
    };

    goalRepo.save(goal);
    const retrieved = goalRepo.get();

    expect(retrieved).not.toBeNull();
    expect(retrieved!.dailyKcal).toBe(2000);
  });

  it("should reject when ratios do not sum to 100", () => {
    expect(() =>
      goalRepo.save({
        dailyKcal: 2000,
        goalType: "maintain",
        carbRatio: 50,
        proteinRatio: 30,
        fatRatio: 19,
        updatedAt: Date.now(),
      })
    ).toThrow();
  });

  it("should accept when ratios sum exactly to 100", () => {
    const goal: UserGoal = {
      dailyKcal: 2000,
      goalType: "maintain",
      carbRatio: 50,
      proteinRatio: 30,
      fatRatio: 20,
      updatedAt: Date.now(),
    };

    goalRepo.save(goal);
    const retrieved = goalRepo.get();

    expect(retrieved).not.toBeNull();
    expect(retrieved!.carbRatio + retrieved!.proteinRatio + retrieved!.fatRatio).toBe(100);
  });
});

describe("AC-6: Corrupt JSON recovery (empty array / null)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should return empty array when meals storage is corrupted", () => {
    localStorage.setItem(STORAGE_KEYS.meals, "{broken");
    const meals = mealsRepo.listByDate(todayKST());
    expect(Array.isArray(meals)).toBe(true);
    expect(meals).toEqual([]);
  });

  it("should return null when goal storage is corrupted", () => {
    localStorage.setItem(STORAGE_KEYS.goal, "{broken");
    const goal = goalRepo.get();
    expect(goal).toBeNull();
  });
});

describe("AC-7: ID generation (UUID) and date (KST)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should generate unique UUIDs for each meal", () => {
    const input = {
      mealType: "lunch" as const,
      foodName: "계란",
      source: "manual" as const,
      amountGram: 100,
      kcal: 155,
      carbG: 1.1,
      proteinG: 13.0,
      fatG: 11.0,
      aiGenerated: false,
      edited: false,
    };

    const added1 = mealsRepo.add(input);
    const added2 = mealsRepo.add(input);

    expect(added1.id).not.toBe(added2.id);
    expect(added1.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it("should assign KST date to meal", () => {
    const input = {
      mealType: "lunch" as const,
      foodName: "계란",
      source: "manual" as const,
      amountGram: 100,
      kcal: 155,
      carbG: 1.1,
      proteinG: 13.0,
      fatG: 11.0,
      aiGenerated: false,
      edited: false,
    };

    const added = mealsRepo.add(input);
    expect(added.date).toBe(todayKST());
  });
});

describe("AC-8: mealsRepo CRUD (add, listByDate, listRange, update, remove)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should add meal and retrieve by date", () => {
    const input = {
      mealType: "lunch" as const,
      foodName: "계란",
      source: "manual" as const,
      amountGram: 100,
      kcal: 155,
      carbG: 1.1,
      proteinG: 13.0,
      fatG: 11.0,
      aiGenerated: false,
      edited: false,
    };

    const added = mealsRepo.add(input);
    const meals = mealsRepo.listByDate(todayKST());

    expect(meals).toHaveLength(1);
    expect(meals[0].id).toBe(added.id);
    expect(meals[0].foodName).toBe("계란");
  });

  it("should list meals in date range", () => {
    const input = {
      mealType: "lunch" as const,
      foodName: "계란",
      source: "manual" as const,
      amountGram: 100,
      kcal: 155,
      carbG: 1.1,
      proteinG: 13.0,
      fatG: 11.0,
      aiGenerated: false,
      edited: false,
    };

    const added = mealsRepo.add(input);
    const meals = mealsRepo.listRange("2026-01-01", "2099-12-31");

    expect(meals.length).toBeGreaterThanOrEqual(1);
    expect(meals.some((m) => m.id === added.id)).toBe(true);
  });

  it("should update meal by id", () => {
    const input = {
      mealType: "lunch" as const,
      foodName: "계란",
      source: "manual" as const,
      amountGram: 100,
      kcal: 155,
      carbG: 1.1,
      proteinG: 13.0,
      fatG: 11.0,
      aiGenerated: false,
      edited: false,
    };

    const added = mealsRepo.add(input);
    const updated = mealsRepo.update(added.id, { foodName: "달걀", kcal: 160 });

    expect(updated.foodName).toBe("달걀");
    expect(updated.kcal).toBe(160);
    expect(updated.id).toBe(added.id);
  });

  it("should remove meal by id", () => {
    const input = {
      mealType: "lunch" as const,
      foodName: "계란",
      source: "manual" as const,
      amountGram: 100,
      kcal: 155,
      carbG: 1.1,
      proteinG: 13.0,
      fatG: 11.0,
      aiGenerated: false,
      edited: false,
    };

    const added = mealsRepo.add(input);
    mealsRepo.remove(added.id);
    const meals = mealsRepo.listByDate(todayKST());

    expect(meals.some((m) => m.id === added.id)).toBe(false);
  });
});

describe("AC-9: goalRepo get/save", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should save and retrieve goal", () => {
    const goal: UserGoal = {
      dailyKcal: 2200,
      goalType: "lose",
      carbRatio: 50,
      proteinRatio: 30,
      fatRatio: 20,
      updatedAt: Date.now(),
    };

    goalRepo.save(goal);
    const retrieved = goalRepo.get();

    expect(retrieved).not.toBeNull();
    expect(retrieved!.dailyKcal).toBe(2200);
    expect(retrieved!.goalType).toBe("lose");
  });

  it("should return null when no goal saved", () => {
    const retrieved = goalRepo.get();
    expect(retrieved).toBeNull();
  });

  it("should auto-assign updatedAt timestamp", () => {
    const before = Date.now();
    goalRepo.save({
      dailyKcal: 2000,
      goalType: "maintain",
      carbRatio: 50,
      proteinRatio: 30,
      fatRatio: 20,
      updatedAt: 0,
    });
    const after = Date.now();

    const retrieved = goalRepo.get();
    expect(retrieved!.updatedAt).toBeGreaterThanOrEqual(before);
    expect(retrieved!.updatedAt).toBeLessThanOrEqual(after);
  });
});

describe("AC-10: Reuse of 0002 utilities (safeGet, todayKST, toKSTDate)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should use storage utilities from 0002", () => {
    const input = {
      mealType: "lunch" as const,
      foodName: "계란",
      source: "manual" as const,
      amountGram: 100,
      kcal: 155,
      carbG: 1.1,
      proteinG: 13.0,
      fatG: 11.0,
      aiGenerated: false,
      edited: false,
    };

    const added = mealsRepo.add(input);
    const stored = safeGet<MealRecord[]>(STORAGE_KEYS.meals, []);

    expect(stored.some((m) => m.id === added.id)).toBe(true);
  });

  it("should use date utilities from 0002", () => {
    const input = {
      mealType: "lunch" as const,
      foodName: "계란",
      source: "manual" as const,
      amountGram: 100,
      kcal: 155,
      carbG: 1.1,
      proteinG: 13.0,
      fatG: 11.0,
      aiGenerated: false,
      edited: false,
    };

    const added = mealsRepo.add(input);
    expect(added.date).toBe(todayKST());
  });
});
