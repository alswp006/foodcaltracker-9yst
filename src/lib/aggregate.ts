import type { MealRecord, MealType, UserGoal } from "@/lib/types";
import { lastNDaysKST } from "@/lib/date";

interface MacroTotals {
  kcal: number;
  carbG: number;
  proteinG: number;
  fatG: number;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function emptyTotals(): MacroTotals {
  return { kcal: 0, carbG: 0, proteinG: 0, fatG: 0 };
}

export function sumByDate(meals: MealRecord[], date: string): MacroTotals {
  const totals = emptyTotals();

  for (const meal of meals) {
    if (meal.date !== date) continue;
    totals.kcal += meal.kcal;
    totals.carbG += meal.carbG;
    totals.proteinG += meal.proteinG;
    totals.fatG += meal.fatG;
  }

  return {
    kcal: totals.kcal,
    carbG: round1(totals.carbG),
    proteinG: round1(totals.proteinG),
    fatG: round1(totals.fatG),
  };
}

export function sumByMealType(
  meals: MealRecord[],
  date: string,
): Record<MealType, MacroTotals> {
  const raw: Record<MealType, MacroTotals> = {
    breakfast: emptyTotals(),
    lunch: emptyTotals(),
    dinner: emptyTotals(),
    snack: emptyTotals(),
  };

  for (const meal of meals) {
    if (meal.date !== date) continue;
    const bucket = raw[meal.mealType];
    bucket.kcal += meal.kcal;
    bucket.carbG += meal.carbG;
    bucket.proteinG += meal.proteinG;
    bucket.fatG += meal.fatG;
  }

  return {
    breakfast: {
      kcal: raw.breakfast.kcal,
      carbG: round1(raw.breakfast.carbG),
      proteinG: round1(raw.breakfast.proteinG),
      fatG: round1(raw.breakfast.fatG),
    },
    lunch: {
      kcal: raw.lunch.kcal,
      carbG: round1(raw.lunch.carbG),
      proteinG: round1(raw.lunch.proteinG),
      fatG: round1(raw.lunch.fatG),
    },
    dinner: {
      kcal: raw.dinner.kcal,
      carbG: round1(raw.dinner.carbG),
      proteinG: round1(raw.dinner.proteinG),
      fatG: round1(raw.dinner.fatG),
    },
    snack: {
      kcal: raw.snack.kcal,
      carbG: round1(raw.snack.carbG),
      proteinG: round1(raw.snack.proteinG),
      fatG: round1(raw.snack.fatG),
    },
  };
}

export type WeeklySummaryDay = MacroTotals & { date: string };

export type WeeklySummaryResult = WeeklySummaryDay[] & {
  avgKcal: number;
  overDays: number;
};

export function weeklySummary(meals: MealRecord[], goal: UserGoal): WeeklySummaryResult {
  const days = lastNDaysKST(7).map((date) => ({
    date,
    ...sumByDate(meals, date),
  })) as WeeklySummaryResult;

  const totalKcal = days.reduce((sum, day) => sum + day.kcal, 0);

  days.avgKcal = Math.round(totalKcal / days.length);
  days.overDays = days.filter((day) => day.kcal > goal.dailyKcal).length;

  return days;
}
