import type { FoodCandidate, FoodDbItem, MealType } from "@/lib/types";

// ============================================================================
// API Result Types
// ============================================================================

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; message: string };

// ============================================================================
// API Client Functions (to be implemented)
// ============================================================================

/**
 * Analyzes food image and returns AI-detected food candidates
 * POST /api/vision/analyze with 15s timeout
 *
 * Errors are normalized to result objects (no throw):
 * - 422 NO_FOOD_DETECTED → message: '음식을 찾지 못했어요. 다시 찍거나 직접 검색해보세요'
 * - 200 with empty items → same NO_FOOD_DETECTED message
 * - Timeout (15s) → error: 'NETWORK', message: '네트워크 연결을 확인해주세요'
 * - Other errors → normalized with appropriate Korean messages
 */
export async function analyzeImage(
  imageBase64: string,
  mealType: MealType
): Promise<ApiResult<FoodCandidate[]>> {
  // TODO: Implement in packet 0006
  throw new Error("Not implemented");
}

/**
 * Searches food database by query string
 * GET /api/foods/search?q={query}&limit=20
 *
 * - Accepts optional abort signal for cancellation
 * - Always returns result object (no throw)
 * - Abort error → { ok:false, error:'ABORTED', message:... }
 * - q parameter is encodeURIComponent'd
 */
export async function searchFoods(
  query: string,
  signal?: AbortSignal
): Promise<ApiResult<FoodDbItem[]>> {
  // TODO: Implement in packet 0006
  throw new Error("Not implemented");
}
