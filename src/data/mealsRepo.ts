import type { MealRecord, MealType, FoodSource } from "@/lib/types";
import { STORAGE_KEYS } from "@/lib/types";
import { safeGet, safeSet } from "@/lib/storage";
import { todayKST } from "@/lib/date";

export type MealInput = {
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
};

export type MealPatch = Partial<MealInput>;

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function validateMacro(value: number, label: string): number {
  const rounded = round1(value);
  if (Number.isNaN(rounded) || rounded < 0 || rounded > 500) {
    throw new Error(`${label}은(는) 0~500 사이여야 합니다.`);
  }
  return rounded;
}

function normalizeMealInput(input: MealInput): MealInput {
  const foodName = input.foodName.trim();
  if (foodName.length < 1 || foodName.length > 40) {
    throw new Error("음식 이름은 1~40자 사이여야 합니다.");
  }

  if (!Number.isInteger(input.amountGram) || input.amountGram < 1 || input.amountGram > 3000) {
    throw new Error("섭취량은 1~3000g 사이의 정수여야 합니다.");
  }

  if (!Number.isInteger(input.kcal) || input.kcal < 0 || input.kcal > 5000) {
    throw new Error("칼로리는 0~5000 사이의 정수여야 합니다.");
  }

  if (input.kcal === 0 && input.amountGram === 0) {
    throw new Error("칼로리와 섭취량이 모두 0일 수 없습니다.");
  }

  return {
    ...input,
    foodName,
    carbG: validateMacro(input.carbG, "탄수화물"),
    proteinG: validateMacro(input.proteinG, "단백질"),
    fatG: validateMacro(input.fatG, "지방"),
  };
}

function loadMeals(): MealRecord[] {
  const meals = safeGet<MealRecord[]>(STORAGE_KEYS.meals, []);
  return Array.isArray(meals) ? meals : [];
}

function persistMeals(meals: MealRecord[]): void {
  safeSet(STORAGE_KEYS.meals, meals);
}

export const mealsRepo = {
  listByDate(date: string): MealRecord[] {
    return loadMeals().filter((meal) => meal.date === date);
  },

  listRange(from: string, to: string): MealRecord[] {
    return loadMeals().filter((meal) => meal.date >= from && meal.date <= to);
  },

  add(input: MealInput): MealRecord {
    const normalized = normalizeMealInput(input);
    const meal: MealRecord = {
      ...normalized,
      id: crypto.randomUUID(),
      date: todayKST(),
      createdAt: Date.now(),
    };

    const meals = loadMeals();
    meals.push(meal);
    persistMeals(meals);
    return meal;
  },

  update(id: string, patch: MealPatch): MealRecord {
    const meals = loadMeals();
    const index = meals.findIndex((meal) => meal.id === id);
    if (index === -1) {
      throw new Error("수정할 기록을 찾을 수 없습니다.");
    }

    const existing = meals[index];
    const merged: MealInput = {
      mealType: patch.mealType ?? existing.mealType,
      foodName: patch.foodName ?? existing.foodName,
      source: patch.source ?? existing.source,
      amountGram: patch.amountGram ?? existing.amountGram,
      kcal: patch.kcal ?? existing.kcal,
      carbG: patch.carbG ?? existing.carbG,
      proteinG: patch.proteinG ?? existing.proteinG,
      fatG: patch.fatG ?? existing.fatG,
      aiGenerated: patch.aiGenerated ?? existing.aiGenerated,
      edited: patch.edited ?? existing.edited,
    };
    const normalized = normalizeMealInput(merged);

    const updated: MealRecord = {
      ...existing,
      ...normalized,
    };
    meals[index] = updated;
    persistMeals(meals);
    return updated;
  },

  remove(id: string): void {
    const meals = loadMeals();
    persistMeals(meals.filter((meal) => meal.id !== id));
  },
};
