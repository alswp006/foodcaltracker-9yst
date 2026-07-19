// FoodCalTracker Domain Types & Constants
// This file defines all domain entities, enums, and route state contracts
// No function implementations — pure type & constant definitions only

// ============================================================================
// Enum Literal Types
// ============================================================================

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type FoodSource = "ai_photo" | "db_search" | "barcode" | "manual";
export type GoalType = "lose" | "maintain" | "gain";

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
  date: string;
  aiCount: number;
  bonusCount: number;
}

export interface PremiumState {
  active: boolean;
  expiresAt: number;
  lastOrderId: string;
}

export interface AppFlags {
  onboarded: boolean;
  aiNoticeAcknowledged: boolean;
  schemaVersion: 1;
}

export interface FoodCandidate {
  foodName: string;
  confidence: number;
  amountGram: number;
  kcal: number;
  carbG: number;
  proteinG: number;
  fatG: number;
}

export interface FoodDbItem {
  foodId: string;
  foodName: string;
  brand: string;
  servingGram: number;
  kcalPer100g: number;
  carbPer100g: number;
  proteinPer100g: number;
  fatPer100g: number;
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

export type ResultRouteState = {
  candidates: FoodCandidate[];
  mealType: MealType;
  source: FoodSource;
  editingId?: string;
};

export type RouteState = {
  "/": undefined;
  "/onboarding": undefined;
  "/capture": { mealType: MealType } | undefined;
  "/result": ResultRouteState;
  "/search": { mealType: MealType } | undefined;
  "/premium": undefined;
  "/report": undefined;
  "/settings": undefined;
  "/settings/goal": undefined;
};

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
  date: "1970-01-01",
  aiCount: 0,
  bonusCount: 0,
};

export const DEFAULT_PREMIUM: PremiumState = {
  active: false,
  expiresAt: 0,
  lastOrderId: "",
};

export const DEFAULT_FLAGS: AppFlags = {
  onboarded: false,
  aiNoticeAcknowledged: false,
  schemaVersion: 1,
};
