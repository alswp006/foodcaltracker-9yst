import type { MealRecord, MealType, UserGoal } from "@/lib/types";
import { toKSTDate } from "@/lib/date";
import type { DailySummary, WeeklySummary, GoalProgress, MacroRatio } from "./types";

export type { DailySummary, WeeklySummary, GoalProgress, MacroRatio } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

function emptyMacroTotals() {
  return { kcal: 0, carbG: 0, proteinG: 0, fatG: 0 };
}

/**
 * Aggregate meal records for a specific date.
 * Returns daily totals and meal-type breakdowns.
 *
 * @param records - Array of MealRecord for any dates
 * @param date - Target date in YYYY-MM-DD format (KST)
 * @returns DailySummary with totals and byMealType breakdown
 *
 * AC-1: Must handle empty array (return all zeros)
 * AC-1: Must filter by exact date match
 * AC-1: Must sum multiple meals per mealType correctly
 */
export function aggregateDaily(records: MealRecord[], date: string): DailySummary {
  const byMealType: Record<MealType, ReturnType<typeof emptyMacroTotals>> = {
    breakfast: emptyMacroTotals(),
    lunch: emptyMacroTotals(),
    dinner: emptyMacroTotals(),
    snack: emptyMacroTotals(),
  };

  let dailyKcal = 0;
  let dailyCarbG = 0;
  let dailyProteinG = 0;
  let dailyFatG = 0;

  for (const record of records) {
    if (record.date !== date) continue;
    dailyKcal += record.kcal;
    dailyCarbG += record.carbG;
    dailyProteinG += record.proteinG;
    dailyFatG += record.fatG;

    const bucket = byMealType[record.mealType];
    bucket.kcal += record.kcal;
    bucket.carbG += record.carbG;
    bucket.proteinG += record.proteinG;
    bucket.fatG += record.fatG;
  }

  return {
    date,
    dailyKcal,
    dailyCarbG,
    dailyProteinG,
    dailyFatG,
    byMealType,
  };
}

function kstMidnightUtcMs(dateStr: string): number {
  const [year, month, day] = dateStr.split("-").map(Number);
  return Date.UTC(year, month - 1, day, 0, 0, 0);
}

/**
 * Aggregate meal records into a 7-day weekly summary (KST).
 * Always returns 7 entries (one per day), filling missing days with zeros.
 *
 * @param records - Array of MealRecord for any dates
 * @param endDate - Last day of the week in YYYY-MM-DD format (KST)
 * @returns Array of WeeklySummary, length always 7, dates in ascending order
 *
 * AC-2: Must return length 7 regardless of input
 * AC-2: Must be in KST ascending order (oldest to newest)
 * AC-2: Must include days with zero records
 */
export function aggregateWeekly(records: MealRecord[], endDate: string): WeeklySummary[] {
  const endMs = kstMidnightUtcMs(endDate);
  const result: WeeklySummary[] = [];

  for (let i = 6; i >= 0; i--) {
    const day = toKSTDate(new Date(endMs - i * DAY_MS));
    const daily = aggregateDaily(records, day);
    result.push({
      date: daily.date,
      dailyKcal: daily.dailyKcal,
      dailyCarbG: daily.dailyCarbG,
      dailyProteinG: daily.dailyProteinG,
      dailyFatG: daily.dailyFatG,
    });
  }

  return result;
}

/**
 * Calculate goal progress from daily summary.
 * Safe from NaN/Infinity when goal is missing or goal.dailyKcal is 0.
 *
 * @param dailySum - DailySummary from aggregateDaily
 * @param goal - UserGoal (can be null/undefined)
 * @returns GoalProgress with percentage and remainingKcal
 *
 * AC-3: Must return 0 when goal is null/undefined
 * AC-3: Must return 0 percentage when goal.dailyKcal is 0
 * AC-3: percentage = floor(dailySum.dailyKcal / goal.dailyKcal * 1000)
 * AC-3: No NaN, no Infinity
 */
export function calcGoalProgress(
  dailySum: DailySummary,
  goal: UserGoal | null | undefined,
): GoalProgress {
  if (!goal || goal.dailyKcal <= 0) {
    return { percentage: 0, remainingKcal: 0 };
  }

  const percentage = Math.floor((dailySum.dailyKcal / goal.dailyKcal) * 1000);
  const remainingKcal = goal.dailyKcal - dailySum.dailyKcal;

  return { percentage, remainingKcal };
}

/**
 * Calculate macro (carb/protein/fat) ratio as a percentage of total daily kcal.
 * Guards the dailyKcal denominator against 0 to avoid NaN/Infinity.
 *
 * carb/protein = 4 kcal per gram, fat = 9 kcal per gram.
 *
 * AC-4: Must guard against dailyKcal === 0 (returns all zeros)
 * AC-4: No NaN, no Infinity
 */
export function calcMacroRatio(
  dailySum: Pick<DailySummary, "dailyKcal" | "dailyCarbG" | "dailyProteinG" | "dailyFatG">,
): MacroRatio {
  if (dailySum.dailyKcal <= 0) {
    return { carbRatio: 0, proteinRatio: 0, fatRatio: 0 };
  }

  const carbKcal = dailySum.dailyCarbG * 4;
  const proteinKcal = dailySum.dailyProteinG * 4;
  const fatKcal = dailySum.dailyFatG * 9;

  return {
    carbRatio: Math.round((carbKcal / dailySum.dailyKcal) * 100),
    proteinRatio: Math.round((proteinKcal / dailySum.dailyKcal) * 100),
    fatRatio: Math.round((fatKcal / dailySum.dailyKcal) * 100),
  };
}
