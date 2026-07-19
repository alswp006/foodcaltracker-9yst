import { useCallback, useEffect, useMemo, useState } from "react";
import { safeGet, safeSet } from "@/lib/storage";
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
  UserGoal,
  UsageQuota,
  PremiumState,
} from "@/lib/types";
import { bootstrap } from "@/lib/bootstrap";
import { todayKST } from "@/lib/date";

const FREE_DAILY_QUOTA = 3;

// ── useAppReady ──
export function useAppReady(): boolean {
  const [ready, setReady] = useState<boolean>(() => {
    if (localStorage.getItem(STORAGE_KEYS.flags) === null) return false;
    const flags = safeGet<AppFlags>(STORAGE_KEYS.flags, DEFAULT_FLAGS);
    return flags.schemaVersion === 1;
  });

  useEffect(() => {
    if (!ready) {
      bootstrap();
      setReady(true);
    }
  }, [ready]);

  return ready;
}

// ── useMeals ──
export function useMeals() {
  const [meals, setMeals] = useState<MealRecord[]>(() =>
    safeGet<MealRecord[]>(STORAGE_KEYS.meals, []),
  );

  const todayMeals = useMemo(
    () => meals.filter((meal) => meal.date === todayKST()),
    [meals],
  );

  const add = useCallback((meal: MealRecord) => {
    setMeals((prev) => {
      const next = [...prev, meal];
      safeSet(STORAGE_KEYS.meals, next);
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setMeals((prev) => {
      const next = prev.filter((meal) => meal.id !== id);
      safeSet(STORAGE_KEYS.meals, next);
      return next;
    });
  }, []);

  return { meals, todayMeals, add, remove };
}

// ── useGoal ──
export function useGoal() {
  const [goal, setGoal] = useState<UserGoal>(() =>
    safeGet<UserGoal>(STORAGE_KEYS.goal, DEFAULT_GOAL),
  );

  const save = useCallback((next: UserGoal) => {
    const saved: UserGoal = { ...next, updatedAt: Date.now() };
    safeSet(STORAGE_KEYS.goal, saved);
    setGoal(saved);
  }, []);

  return { goal, save };
}

// ── useQuota ──
export function useQuota() {
  const [quota, setQuota] = useState<UsageQuota>(() => {
    const stored = safeGet<UsageQuota>(STORAGE_KEYS.quota, DEFAULT_QUOTA);
    if (stored.date !== todayKST()) {
      const reset: UsageQuota = { date: todayKST(), aiCount: 0, bonusCount: 0 };
      safeSet(STORAGE_KEYS.quota, reset);
      return reset;
    }
    return stored;
  });

  const consume = useCallback(() => {
    setQuota((prev) => {
      const next = { ...prev, aiCount: prev.aiCount + 1 };
      safeSet(STORAGE_KEYS.quota, next);
      return next;
    });
  }, []);

  const remaining = FREE_DAILY_QUOTA + quota.bonusCount - quota.aiCount;

  return { quota, remaining, consume };
}

// ── usePremium ──
export function usePremium() {
  const [premium, setPremium] = useState<PremiumState>(() =>
    safeGet<PremiumState>(STORAGE_KEYS.premium, DEFAULT_PREMIUM),
  );

  const activate = useCallback((next: PremiumState) => {
    safeSet(STORAGE_KEYS.premium, next);
    setPremium(next);
  }, []);

  return { ...premium, activate };
}
