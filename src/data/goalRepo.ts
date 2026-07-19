import type { UserGoal } from "@/lib/types";
import { STORAGE_KEYS } from "@/lib/types";
import { safeGet, safeSet } from "@/lib/storage";

function validateGoal(goal: UserGoal): void {
  if (!Number.isInteger(goal.dailyKcal) || goal.dailyKcal < 800 || goal.dailyKcal > 5000) {
    throw new Error("일일 목표 칼로리는 800~5000 사이의 정수여야 합니다.");
  }

  const ratioSum = goal.carbRatio + goal.proteinRatio + goal.fatRatio;
  if (ratioSum !== 100) {
    throw new Error("탄수화물/단백질/지방 비율의 합은 100이어야 합니다.");
  }
}

export const goalRepo = {
  get(): UserGoal | null {
    return safeGet<UserGoal | null>(STORAGE_KEYS.goal, null);
  },

  save(goal: UserGoal): UserGoal {
    validateGoal(goal);
    const record: UserGoal = {
      ...goal,
      updatedAt: Date.now(),
    };
    safeSet(STORAGE_KEYS.goal, record);
    return record;
  },
};
