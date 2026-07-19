import type { MealType } from "@/lib/types";

export interface MacroRatio {
  carbRatio: number;
  proteinRatio: number;
  fatRatio: number;
}

export interface DailySummary {
  date: string;
  dailyKcal: number;
  dailyCarbG: number;
  dailyProteinG: number;
  dailyFatG: number;
  byMealType: Record<MealType, {
    kcal: number;
    carbG: number;
    proteinG: number;
    fatG: number;
  }>;
}

export interface WeeklySummary {
  date: string;
  dailyKcal: number;
  dailyCarbG: number;
  dailyProteinG: number;
  dailyFatG: number;
}

export interface GoalProgress {
  percentage: number; // integer, dailyKcal / goal.dailyKcal * 1000
  remainingKcal: number;
}
