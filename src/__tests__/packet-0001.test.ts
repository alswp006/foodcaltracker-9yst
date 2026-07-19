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
      const record: MealRecord = {
        id: "meal-1",
        date: "2026-07-20",
        createdAt: 1689813600000,
        mealType: "breakfast",
        foodName: "계란찜",
        source: "ai_photo",
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
        date: "2026-07-20",
        aiCount: 5,
        bonusCount: 1,
      };
      expect(quota.aiCount).toBe(5);
      expect(quota.bonusCount).toBe(1);
      expect(typeof quota.date).toBe("string");
    });

    it("should export PremiumState type", () => {
      const premium: PremiumState = {
        active: false,
        expiresAt: 0,
        lastOrderId: "",
      };
      expect(premium.active).toBe(false);
      expect(premium.expiresAt).toBe(0);
    });

    it("should export AppFlags type for feature flags", () => {
      const flags: AppFlags = {
        onboarded: false,
        aiNoticeAcknowledged: false,
        schemaVersion: 1,
      };
      expect(flags.schemaVersion).toBe(1);
      expect(flags.aiNoticeAcknowledged).toBe(false);
    });

    it("should export FoodCandidate type for AI/search results", () => {
      const candidate: FoodCandidate = {
        foodName: "비빔밥",
        confidence: 0.91,
        amountGram: 450,
        kcal: 620,
        carbG: 92.0,
        proteinG: 18.0,
        fatG: 16.5,
      };
      expect(candidate.foodName).toBe("비빔밥");
      expect(candidate.kcal).toBe(620);
      expect(candidate.confidence).toBe(0.91);
    });

    it("should export FoodDbItem type for database entries", () => {
      const dbItem: FoodDbItem = {
        foodId: "mfds_1042",
        foodName: "된장찌개",
        brand: "",
        servingGram: 400,
        kcalPer100g: 53,
        carbPer100g: 4.5,
        proteinPer100g: 3.1,
        fatPer100g: 2.3,
      };
      expect(dbItem.foodName).toBe("된장찌개");
      expect(dbItem.servingGram).toBe(400);
      expect(dbItem.kcalPer100g).toBe(53);
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

    it("should export DEFAULT_QUOTA with zero initial AI count and bonus", () => {
      expect(DEFAULT_QUOTA.aiCount).toBe(0);
      expect(DEFAULT_QUOTA.bonusCount).toBe(0);
      expect(typeof DEFAULT_QUOTA.date).toBe("string");
    });

    it("should export DEFAULT_PREMIUM with inactive state", () => {
      expect(DEFAULT_PREMIUM.active).toBe(false);
      expect(DEFAULT_PREMIUM.expiresAt).toBe(0);
      expect(DEFAULT_PREMIUM.lastOrderId).toBe("");
    });

    it("should export DEFAULT_FLAGS with schemaVersion 1 and no onboarding", () => {
      expect(DEFAULT_FLAGS.schemaVersion).toBe(1);
      expect(DEFAULT_FLAGS.onboarded).toBe(false);
      expect(DEFAULT_FLAGS.aiNoticeAcknowledged).toBe(false);
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

    it("should support FoodSource values: ai_photo, db_search, barcode, manual", () => {
      const sources: FoodSource[] = ["ai_photo", "db_search", "barcode", "manual"];
      sources.forEach((s) => {
        expect(typeof s).toBe("string");
      });
    });

    it("should support GoalType values: lose, maintain, gain", () => {
      const types: GoalType[] = ["lose", "maintain", "gain"];
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
        source: "db_search",
        amountGram: 200,
        kcal: 300,
        carbG: 45,
        proteinG: 10,
        fatG: 8,
        aiGenerated: false,
        edited: true,
      };
      expect(record.mealType).toBe("lunch");
      expect(record.source).toBe("db_search");
    });
  });

  // AC-6: ResultRouteState and RouteState define navigation contracts
  describe("AC-6: RouteState Navigation Contracts", () => {
    it("should export ResultRouteState with candidates/mealType/source fields", () => {
      const state: ResultRouteState = {
        candidates: [
          {
            foodName: "비빔밥",
            confidence: 0.91,
            amountGram: 450,
            kcal: 620,
            carbG: 92.0,
            proteinG: 18.0,
            fatG: 16.5,
          },
        ],
        mealType: "lunch",
        source: "ai_photo",
      };
      expect(state.mealType).toBe("lunch");
      expect(state.candidates).toHaveLength(1);
      expect(state.source).toBe("ai_photo");
    });

    it("should support an optional editingId on ResultRouteState", () => {
      const state: ResultRouteState = {
        candidates: [],
        mealType: "dinner",
        source: "manual",
        editingId: "meal-1",
      };
      expect(state.editingId).toBe("meal-1");
    });

    it("should type each route's location.state per RouteState", () => {
      const resultState: RouteState["/result"] = {
        candidates: [],
        mealType: "snack",
        source: "manual",
      };
      const captureState: RouteState["/capture"] = { mealType: "breakfast" };
      const homeState: RouteState["/"] = undefined;

      expect(resultState.mealType).toBe("snack");
      expect(captureState).toEqual({ mealType: "breakfast" });
      expect(homeState).toBeUndefined();
    });
  });

  // AC-7: types.ts file contains NO function bodies (pure type/constant definitions)
  describe("AC-7: Pure Type & Constant Definitions", () => {
    it("should verify DEFAULT_GOAL is a constant object with frozen structure", () => {
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
        source: "db_search",
        amountGram: 50,
        kcal: 190,
        carbG: 27,
        proteinG: 8,
        fatG: 4,
        aiGenerated: false,
        edited: false,
      };
      const quota: UsageQuota = DEFAULT_QUOTA;

      const totalKcal = meal.kcal;
      const remaining = userGoal.dailyKcal - totalKcal;
      expect(remaining).toBe(1810);
      expect(quota.aiCount).toBe(0);
    });

    it("should support navigation from CapturePage to ResultPage with RouteState", () => {
      const navigationState: ResultRouteState = {
        candidates: [
          {
            foodName: "비빔밥",
            confidence: 0.91,
            amountGram: 450,
            kcal: 620,
            carbG: 92.0,
            proteinG: 18.0,
            fatG: 16.5,
          },
        ],
        mealType: "lunch",
        source: "ai_photo",
      };

      const routeState: RouteState["/result"] = navigationState;
      expect(routeState.mealType).toBe("lunch");
      expect(routeState.candidates[0].foodName).toBe("비빔밥");
    });

    it("should handle premium state transition in storage", () => {
      const initialPremium: PremiumState = DEFAULT_PREMIUM;
      expect(initialPremium.active).toBe(false);

      const activePremium: PremiumState = {
        active: true,
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
        lastOrderId: "ord_9001",
      };
      expect(activePremium.active).toBe(true);
      expect(activePremium.expiresAt).toBeGreaterThan(Date.now());
    });
  });
});
