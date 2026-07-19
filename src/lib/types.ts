// FoodCalTracker Domain Types & Constants
// This file defines all domain entities, enums, and route state contracts
// No function implementations — pure type & constant definitions only

// ============================================================================
// Enum Literal Types
// ============================================================================

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type FoodSource = "user_input" | "ai_generated" | "food_db";
export type GoalType = "maintain" | "gain" | "lose";

// ============================================================================
// Domain Entity Types
// ============================================================================

export interface MealRecord {
  id: string;
  date: string;
  createdAt: number;
  mealType: MealType;
  foodName: string;
  source: FoodSource;
  amountGram: number;
  kcal: number;
  carbG: number;
  proteinG: number;
  fatG: number;
  aiGenerated: boolean;
  edited: boolean;
}

export interface UserGoal {
  dailyKcal: number;
  goalType: GoalType;
  carbRatio: number;
  proteinRatio: number;
  fatRatio: number;
  updatedAt: number;
}

export interface UsageQuota {
  aiCount: number;
  aiCountLimit: number;
  lastResetDate: string;
}

export interface PremiumState {
  active: boolean;
  expiresAt: number | null;
  purchaseDate: number | null;
}

export interface AppFlags {
  schemaVersion: number;
  aiNoticeDismissed: boolean;
  preferredLanguage: string;
}

export interface FoodCandidate {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  unit: string;
}

export interface FoodDbItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: string;
  source: string;
}

// ============================================================================
// Result/Response Types
// ============================================================================

export type StorageResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: "STORAGE_FULL" | "INVALID_INPUT" };

// ============================================================================
// Navigation Route State Contract
// ============================================================================

export interface ResultRouteState {
  runId: string;
}

export type RouteState = ResultRouteState | undefined;

// ============================================================================
// Storage Keys
// ============================================================================

export const STORAGE_KEYS = {
  meals: "fct:meals",
  goal: "fct:goal",
  quota: "fct:quota",
  premium: "fct:premium",
  flags: "fct:flags",
  recentFoods: "fct:recentFoods",
} as const;

// ============================================================================
// Default Values
// ============================================================================

export const DEFAULT_GOAL: UserGoal = {
  dailyKcal: 2000,
  goalType: "maintain",
  carbRatio: 50,
  proteinRatio: 30,
  fatRatio: 20,
  updatedAt: 0,
};

export const DEFAULT_QUOTA: UsageQuota = {
  aiCount: 0,
  aiCountLimit: 10,
  lastResetDate: new Date().toISOString().split("T")[0],
};

export const DEFAULT_PREMIUM: PremiumState = {
  active: false,
  expiresAt: null,
  purchaseDate: null,
};

export const DEFAULT_FLAGS: AppFlags = {
  schemaVersion: 1,
  aiNoticeDismissed: false,
  preferredLanguage: "ko",
};
