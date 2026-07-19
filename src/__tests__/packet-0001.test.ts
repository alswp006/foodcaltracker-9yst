import { describe, it, expect } from "vitest";
import type {
  MealRecord,
  UserGoal,
  UsageQuota,
  PremiumState,
  AppFlags,
  FoodCandidate,
  FoodDbItem,
  ResultRouteState,
  RouteState,
  StorageResult,
  MealType,
  FoodSource,
  GoalType,
} from "@/lib/types";
import {
  STORAGE_KEYS,
  DEFAULT_GOAL,
  DEFAULT_QUOTA,
  DEFAULT_PREMIUM,
  DEFAULT_FLAGS,
} from "@/lib/types";

describe("FoodCalTracker Domain Types & RouteState Contract (packet-0001)", () => {
  // AC-1: types.ts exports all required domain entity types
  describe("AC-1: Domain Entity Type Exports", () => {
    it("should export MealRecord type", () => {
      // Verify MealRecord has required fields by type assertion
      const record: MealRecord = {
        id: "meal-1",
        date: "2026-07-20",
        createdAt: 1689813600000,
        mealType: "breakfast",
        foodName: "계란 계란",
        source: "user_input",
        amountGram: 100,
        kcal: 155,
        carbG: 1.1,
        proteinG: 13.0,
        fatG: 11.0,
        aiGenerated: false,
        edited: false,
      };
      expect(record.id).toBe("meal-1");
      expect(record.mealType).toBe("breakfast");
      expect(record.kcal).toBe(155);
    });

    it("should export UserGoal type with all goal-tracking fields", () => {
      const goal: UserGoal = {
        dailyKcal: 2000,
        goalType: "maintain",
        carbRatio: 50,
        proteinRatio: 30,
        fatRatio: 20,
        updatedAt: 1689813600000,
      };
      expect(goal.dailyKcal).toBe(2000);
      expect(goal.goalType).toBe("maintain");
      expect(goal.carbRatio + goal.proteinRatio + goal.fatRatio).toBe(100);
    });

    it("should export UsageQuota type for tracking AI feature usage", () => {
      const quota: UsageQuota = {
        aiCount: 5,
        aiCountLimit: 10,
        lastResetDate: "2026-07-20",
      };
      expect(quota.aiCount).toBe(5);
      expect(quota.aiCountLimit).toBe(10);
      expect(typeof quota.lastResetDate).toBe("string");
    });

    it("should export PremiumState type", () => {
      const premium: PremiumState = {
        active: false,
        expiresAt: null,
        purchaseDate: null,
      };
      expect(premium.active).toBe(false);
      expect(premium.expiresAt).toBeNull();
    });

    it("should export AppFlags type for feature flags", () => {
      const flags: AppFlags = {
        schemaVersion: 1,
        aiNoticeDismissed: false,
        preferredLanguage: "ko",
      };
      expect(flags.schemaVersion).toBe(1);
      expect(flags.aiNoticeDismissed).toBe(false);
    });

    it("should export FoodCandidate type for search results", () => {
      const candidate: FoodCandidate = {
        id: "cand-1",
        name: "사과",
        calories: 52,
        protein: 0.3,
        carbs: 13.8,
        fat: 0.2,
        unit: "100g",
      };
      expect(candidate.name).toBe("사과");
      expect(candidate.calories).toBe(52);
      expect(candidate.unit).toBe("100g");
    });

    it("should export FoodDbItem type for database entries", () => {
      const dbItem: FoodDbItem = {
        id: "db-1",
        name: "흰 쌀밥",
        calories: 130,
        protein: 2.7,
        carbs: 28.0,
        fat: 0.3,
        servingSize: "150g",
        source: "korean_food_db",
      };
      expect(dbItem.name).toBe("흰 쌀밥");
      expect(dbItem.servingSize).toBe("150g");
      expect(dbItem.source).toBe("korean_food_db");
    });
  });

  // AC-2: STORAGE_KEYS constant matches expected structure
  describe("AC-2: STORAGE_KEYS Constant", () => {
    it("should export STORAGE_KEYS with correct key names", () => {
      expect(STORAGE_KEYS.meals).toBe("fct:meals");
      expect(STORAGE_KEYS.goal).toBe("fct:goal");
      expect(STORAGE_KEYS.quota).toBe("fct:quota");
      expect(STORAGE_KEYS.premium).toBe("fct:premium");
      expect(STORAGE_KEYS.flags).toBe("fct:flags");
      expect(STORAGE_KEYS.recentFoods).toBe("fct:recentFoods");
    });

    it("should have exactly 6 storage keys", () => {
      const keys = Object.keys(STORAGE_KEYS);
      expect(keys).toHaveLength(6);
    });

    it("should all keys be prefixed with 'fct:'", () => {
      Object.values(STORAGE_KEYS).forEach((key) => {
        expect(key).toMatch(/^fct:/);
      });
    });
  });

  // AC-3: DEFAULT_* constants have correct default values
  describe("AC-3: Default Constants", () => {
    it("should export DEFAULT_GOAL with correct structure and values", () => {
      expect(DEFAULT_GOAL.dailyKcal).toBe(2000);
      expect(DEFAULT_GOAL.goalType).toBe("maintain");
      expect(DEFAULT_GOAL.carbRatio).toBe(50);
      expect(DEFAULT_GOAL.proteinRatio).toBe(30);
      expect(DEFAULT_GOAL.fatRatio).toBe(20);
      expect(DEFAULT_GOAL.updatedAt).toBe(0);
    });

    it("should export DEFAULT_QUOTA with zero initial AI count", () => {
      expect(DEFAULT_QUOTA.aiCount).toBe(0);
      expect(typeof DEFAULT_QUOTA.aiCountLimit).toBe("number");
      expect(DEFAULT_QUOTA.aiCountLimit).toBeGreaterThan(0);
      expect(typeof DEFAULT_QUOTA.lastResetDate).toBe("string");
    });

    it("should export DEFAULT_PREMIUM with inactive state", () => {
      expect(DEFAULT_PREMIUM.active).toBe(false);
      expect(DEFAULT_PREMIUM.expiresAt).toBeNull();
      expect(DEFAULT_PREMIUM.purchaseDate).toBeNull();
    });

    it("should export DEFAULT_FLAGS with schemaVersion 1 and no dismissal", () => {
      expect(DEFAULT_FLAGS.schemaVersion).toBe(1);
      expect(DEFAULT_FLAGS.aiNoticeDismissed).toBe(false);
      expect(DEFAULT_FLAGS.preferredLanguage).toBe("ko");
    });
  });

  // AC-4: StorageResult type defines success/error union correctly
  describe("AC-4: StorageResult Type Contract", () => {
    it("should support success result with data", () => {
      const success: StorageResult<UserGoal> = {
        ok: true,
        data: DEFAULT_GOAL,
      };
      expect(success.ok).toBe(true);
      expect(success.data).toEqual(DEFAULT_GOAL);
    });

    it("should support success result without data", () => {
      const success: StorageResult<void> = {
        ok: true,
      };
      expect(success.ok).toBe(true);
      expect(success.data).toBeUndefined();
    });

    it("should support error result with STORAGE_FULL error code", () => {
      const error: StorageResult<UserGoal> = {
        ok: false,
        error: "STORAGE_FULL",
      };
      expect(error.ok).toBe(false);
      expect(error.error).toBe("STORAGE_FULL");
    });

    it("should support error result with INVALID_INPUT error code", () => {
      const error: StorageResult<UserGoal> = {
        ok: false,
        error: "INVALID_INPUT",
      };
      expect(error.ok).toBe(false);
      expect(error.error).toBe("INVALID_INPUT");
    });
  });

  // AC-5: Enum literal types (MealType, FoodSource, GoalType) are defined
  describe("AC-5: Enum Literal Types", () => {
    it("should support MealType values: breakfast, lunch, dinner, snack", () => {
      const types: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
      types.forEach((t) => {
        expect(typeof t).toBe("string");
      });
    });

    it("should support FoodSource values: user_input, ai_generated, food_db", () => {
      const sources: FoodSource[] = ["user_input", "ai_generated", "food_db"];
      sources.forEach((s) => {
        expect(typeof s).toBe("string");
      });
    });

    it("should support GoalType values: maintain, gain, lose", () => {
      const types: GoalType[] = ["maintain", "gain", "lose"];
      types.forEach((t) => {
        expect(typeof t).toBe("string");
      });
    });

    it("should use MealType and FoodSource in MealRecord", () => {
      const record: MealRecord = {
        id: "1",
        date: "2026-07-20",
        createdAt: Date.now(),
        mealType: "lunch",
        foodName: "김밥",
        source: "food_db",
        amountGram: 200,
        kcal: 300,
        carbG: 45,
        proteinG: 10,
        fatG: 8,
        aiGenerated: false,
        edited: true,
      };
      expect(record.mealType).toBe("lunch");
      expect(record.source).toBe("food_db");
    });
  });

  // AC-6: ResultRouteState and RouteState define navigation contracts
  describe("AC-6: RouteState Navigation Contracts", () => {
    it("should export ResultRouteState with required runId field", () => {
      const state: ResultRouteState = {
        runId: "result-12345",
      };
      expect(state.runId).toBe("result-12345");
      expect(typeof state.runId).toBe("string");
    });

    it("should export RouteState as union type for all navigation states", () => {
      // RouteState should be a discriminated union or general type
      // At minimum, it should support ResultRouteState
      const resultState: RouteState = {
        runId: "result-67890",
      };
      expect((resultState as ResultRouteState).runId).toBe("result-67890");
    });

    it("should support empty/undefined RouteState for non-parameterized routes", () => {
      // For routes like /home, /input, /settings that don't need state
      const emptyState: RouteState = undefined;
      expect(emptyState).toBeUndefined();
    });
  });

  // AC-7: types.ts file contains NO function bodies (pure type/constant definitions)
  describe("AC-7: Pure Type & Constant Definitions", () => {
    it("should verify DEFAULT_GOAL is a constant object with frozen structure", () => {
      // Defaults should be objects with primitive values, not functions
      expect(typeof DEFAULT_GOAL).toBe("object");
      expect(typeof DEFAULT_GOAL.dailyKcal).toBe("number");
      expect(typeof DEFAULT_GOAL.goalType).toBe("string");
    });

    it("should verify STORAGE_KEYS is a constant object mapping strings to strings", () => {
      expect(typeof STORAGE_KEYS).toBe("object");
      Object.values(STORAGE_KEYS).forEach((value) => {
        expect(typeof value).toBe("string");
      });
    });
  });

  // AC-8: No HEX color strings are hardcoded in types.ts
  describe("AC-8: No Hardcoded HEX Colors", () => {
    it("should not have any HEX color values in STORAGE_KEYS", () => {
      const hexPattern = /#[0-9a-fA-F]{3,6}/;
      Object.values(STORAGE_KEYS).forEach((value) => {
        expect(value).not.toMatch(hexPattern);
      });
    });

    it("should not have any HEX color values in DEFAULT_* constants", () => {
      const hexPattern = /#[0-9a-fA-F]{3,6}/;
      [DEFAULT_GOAL, DEFAULT_QUOTA, DEFAULT_PREMIUM, DEFAULT_FLAGS].forEach(
        (constant) => {
          const serialized = JSON.stringify(constant);
          expect(serialized).not.toMatch(hexPattern);
        }
      );
    });
  });

  // Integration: All types compose together for real data flow
  describe("Integration: Complete Data Flow Types", () => {
    it("should compose UserGoal, MealRecord, and UsageQuota for tracking workflow", () => {
      const userGoal: UserGoal = DEFAULT_GOAL;
      const meal: MealRecord = {
        id: "meal-breakfast-1",
        date: "2026-07-20",
        createdAt: 1689813600000,
        mealType: "breakfast",
        foodName: "오트밀",
        source: "food_db",
        amountGram: 50,
        kcal: 190,
        carbG: 27,
        proteinG: 8,
        fatG: 4,
        aiGenerated: false,
        edited: false,
      };
      const quota: UsageQuota = DEFAULT_QUOTA;

      // Verify composition: can calculate daily progress
      const totalKcal = meal.kcal;
      const remaining = userGoal.dailyKcal - totalKcal;
      expect(remaining).toBe(1810);
      expect(quota.aiCount).toBeLessThanOrEqual(quota.aiCountLimit);
    });

    it("should support navigation from InputPage to ResultPage with RouteState", () => {
      // Simulate form submission creating RouteState for navigation
      const runId = "run-" + Date.now();
      const navigationState: ResultRouteState = { runId };

      // Verify state can be passed through React Router
      const routeState: RouteState = navigationState;
      expect((routeState as ResultRouteState).runId).toBe(runId);
    });

    it("should handle premium state transition in storage", () => {
      const initialPremium: PremiumState = DEFAULT_PREMIUM;
      expect(initialPremium.active).toBe(false);

      // Simulate premium purchase
      const activePremium: PremiumState = {
        active: true,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).getTime(),
        purchaseDate: Date.now(),
      };
      expect(activePremium.active).toBe(true);
      expect(activePremium.expiresAt).toBeGreaterThan(Date.now());
    });
  });
});
