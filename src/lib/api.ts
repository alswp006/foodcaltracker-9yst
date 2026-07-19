import type { FoodCandidate, FoodDbItem, MealType } from "@/lib/types";

// ============================================================================
// API Result Types
// ============================================================================

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; message: string };

// ============================================================================
// Internal helpers
// ============================================================================

const DEFAULT_API_BASE_URL = "https://foodcaltracker-api.up.railway.app";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL;
const ANALYZE_TIMEOUT_MS = 15000;

const NO_FOOD_MESSAGE = "음식을 찾지 못했어요. 다시 찍거나 직접 검색해보세요";

const ERROR_MESSAGES: Record<string, string> = {
  NO_FOOD_DETECTED: NO_FOOD_MESSAGE,
  IMAGE_TOO_LARGE: "이미지 용량이 너무 커요. 더 작은 사진으로 다시 시도해주세요",
  RATE_LIMITED: "요청이 많아요. 잠시 후 다시 시도해주세요",
  INTERNAL_ERROR: "서버에 문제가 생겼어요. 잠시 후 다시 시도해주세요",
  NETWORK: "네트워크 연결을 확인해주세요",
  ABORTED: "요청이 취소됐어요",
};

function messageFor(errorCode: string): string {
  return ERROR_MESSAGES[errorCode] ?? "알 수 없는 오류가 발생했어요. 다시 시도해주세요";
}

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError";
}

async function parseErrorBody(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (body && typeof body.error === "string") {
      return body.error;
    }
  } catch {
    // ignore parse failure, fall through to generic error
  }
  return "INTERNAL_ERROR";
}

// ============================================================================
// API Client Functions
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
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ANALYZE_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}/api/vision/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64, mealType }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorCode = await parseErrorBody(response);
      return { ok: false, error: errorCode, message: messageFor(errorCode) };
    }

    const data = await response.json();
    const items: FoodCandidate[] = Array.isArray(data?.items) ? data.items : [];

    if (items.length === 0) {
      return {
        ok: false,
        error: "NO_FOOD_DETECTED",
        message: NO_FOOD_MESSAGE,
      };
    }

    return { ok: true, data: items };
  } catch {
    // Both a real network failure and our own 15s abort reject the fetch promise —
    // either way there's no server response, so both normalize to NETWORK.
    return { ok: false, error: "NETWORK", message: messageFor("NETWORK") };
  } finally {
    clearTimeout(timer);
  }
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
  const url = `${API_BASE_URL}/api/foods/search?q=${encodeURIComponent(query)}&limit=20`;

  try {
    const response = await fetch(url, {
      method: "GET",
      signal,
    });

    if (!response.ok) {
      const errorCode = await parseErrorBody(response);
      return { ok: false, error: errorCode, message: messageFor(errorCode) };
    }

    const data = await response.json();
    const foods: FoodDbItem[] = Array.isArray(data?.foods) ? data.foods : [];
    return { ok: true, data: foods };
  } catch (err) {
    if (isAbortError(err)) {
      return { ok: false, error: "ABORTED", message: messageFor("ABORTED") };
    }
    return { ok: false, error: "NETWORK", message: messageFor("NETWORK") };
  }
}
