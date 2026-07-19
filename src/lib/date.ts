import type { MealType } from "@/lib/types";

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function pad2(n: number): string {
  return n < 10 ? "0" + n : String(n);
}

function shiftToKST(date: Date): Date {
  return new Date(date.getTime() + KST_OFFSET_MS);
}

export function toKSTDate(date: Date): string {
  const shifted = shiftToKST(date);
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth() + 1;
  const day = shifted.getUTCDate();
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function todayKST(): string {
  return toKSTDate(new Date());
}

export function lastNDaysKST(n: number): string[] {
  const now = new Date();
  const result: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    result.push(toKSTDate(new Date(now.getTime() - i * DAY_MS)));
  }
  return result;
}

export function inferMealType(date?: Date): MealType {
  const shifted = shiftToKST(date ?? new Date());
  const hour = shifted.getUTCHours();
  if (hour >= 4 && hour < 10) return "breakfast";
  if (hour >= 10 && hour < 15) return "lunch";
  if (hour >= 15 && hour < 21) return "dinner";
  return "snack";
}
