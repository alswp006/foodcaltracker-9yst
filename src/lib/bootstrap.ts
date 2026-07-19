import { safeGet, safeSet } from "@/lib/storage";
import { todayKST } from "@/lib/date";
import {
  STORAGE_KEYS,
  DEFAULT_GOAL,
  DEFAULT_QUOTA,
  DEFAULT_PREMIUM,
  DEFAULT_FLAGS,
} from "@/lib/types";
import type {
  AppFlags,
  MealRecord,
  FoodDbItem,
  UsageQuota,
  PremiumState,
} from "@/lib/types";

export function getQuota(): UsageQuota {
  const stored = safeGet<UsageQuota>(STORAGE_KEYS.quota, DEFAULT_QUOTA);
  if (stored.date !== todayKST()) {
    const reset: UsageQuota = { date: todayKST(), aiCount: 0, bonusCount: 0 };
    safeSet(STORAGE_KEYS.quota, reset);
    return reset;
  }
  return stored;
}

export function isPremium(): boolean {
  const premium = safeGet<PremiumState>(STORAGE_KEYS.premium, DEFAULT_PREMIUM);
  if (premium.active && premium.expiresAt <= Date.now()) {
    safeSet<PremiumState>(STORAGE_KEYS.premium, { ...premium, active: false });
    return false;
  }
  return premium.active && premium.expiresAt > Date.now();
}

export function bootstrap(): void {
  const flags = safeGet<AppFlags>(STORAGE_KEYS.flags, DEFAULT_FLAGS);

  if (flags.schemaVersion !== 1) {
    safeSet<MealRecord[]>(STORAGE_KEYS.meals, []);
    safeSet(STORAGE_KEYS.goal, DEFAULT_GOAL);
    safeSet(STORAGE_KEYS.quota, DEFAULT_QUOTA);
    safeSet(STORAGE_KEYS.premium, DEFAULT_PREMIUM);
    safeSet<FoodDbItem[]>(STORAGE_KEYS.recentFoods, []);
    safeSet(STORAGE_KEYS.flags, DEFAULT_FLAGS);
  }

  getQuota();
  isPremium();
}
