# Packet 0006: External API Client Tests — TDD Red Phase

## Status
✅ **22 Tests Written** (all failing as expected — red phase)
✅ **TypeScript Compiles** (no errors)
✅ **Ready for Implementation**

## Test File
`src/__tests__/packet-0006.test.ts`

## What Needs Implementing
`src/lib/api.ts` — Two functions:

### 1. `analyzeImage(imageBase64: string, mealType: MealType)`
**Returns:** `ApiResult<FoodCandidate[]>`

**Behavior (from tests):**
- POST to `{VITE_API_BASE_URL}/api/vision/analyze`
- Body: `{ imageBase64, mealType }`
- **15s AbortController timeout** → `{ ok: false, error: 'NETWORK', message: '네트워크 연결을 확인해주세요' }`
- **422 + `{ error: 'NO_FOOD_DETECTED' }`** → `{ ok: false, error: 'NO_FOOD_DETECTED', message: '음식을 찾지 못했어요. 다시 찍거나 직접 검색해보세요' }`
- **200 + `{ items: [] }`** → same NO_FOOD_DETECTED message (empty array is error)
- **Other errors (413, 429, 500)** → normalize with appropriate Korean error messages
- **Success (200 + items)** → `{ ok: true, data: FoodCandidate[] }`
- **Never throw or call console.error** — all errors return result objects

### 2. `searchFoods(query: string, signal?: AbortSignal)`
**Returns:** `ApiResult<FoodDbItem[]>`

**Behavior (from tests):**
- GET to `{VITE_API_BASE_URL}/api/foods/search?q={query}&limit=20`
- `q` parameter must use `encodeURIComponent(query)`
- `limit=20` is always fixed
- **Accepts optional AbortSignal** for cancellation
- **Abort error** → `{ ok: false, error: 'ABORTED', message: '...' }` (no throw)
- **500 error** → `{ ok: false, error: 'INTERNAL_ERROR', message: '...' }`
- **Success** → `{ ok: true, data: FoodDbItem[] }`
- **Never throw or call console.error**

## Error Mapping Expectations (AC-2, AC-6)
```typescript
const errorMessages: Record<string, string> = {
  NO_FOOD_DETECTED: "음식을 찾지 못했어요. 다시 찍거나 직접 검색해보세요",
  NETWORK: "네트워크 연결을 확인해주세요",
  IMAGE_TOO_LARGE: "이미지가 너무 커요. 더 작은 이미지를 선택해주세요", // example
  RATE_LIMITED: "요청이 너무 많아요. 잠시 후 다시 시도해주세요", // example
  INTERNAL_ERROR: "서버 오류가 발생했어요. 나중에 다시 시도해주세요", // example
  ABORTED: "요청이 취소되었어요", // example
};
```

## Test Groups
**analyzeImage (10 tests)**
- AC-1a: timeout handling (AbortController)
- AC-1b: no throw on timeout, return result
- AC-2: 422 error mapping
- AC-2b: 413 IMAGE_TOO_LARGE
- AC-2c: 429 RATE_LIMITED
- AC-2d: 500 INTERNAL_ERROR
- AC-3: 200 with empty items
- POST body verification
- Success with FoodCandidate array

**searchFoods (6 tests)**
- AC-4a: abort signal without throw
- AC-4b: external signal handling
- AC-5a: limit=20 in URL
- AC-5b: encodeURIComponent for q
- AC-5c: GET method + q parameter
- Success with FoodDbItem array
- 500 error handling

**Common (6 tests)**
- AC-6: no console.error, normalized errors
- Result object structure consistency
- Method verification (POST/GET)
- Header verification
- Base URL usage (import.meta.env.VITE_API_BASE_URL)

## Key Constraints
✅ No `console.error` calls  
✅ All errors return result objects (never throw externally)  
✅ Use `import.meta.env.VITE_API_BASE_URL` for base URL  
✅ encodeURIComponent for query parameters  
✅ 15s timeout with AbortController  
✅ Support external AbortSignal for searchFoods  
✅ Empty array (0 items) treated as NO_FOOD_DETECTED error  

## Next Step
Run the Coder to implement `src/lib/api.ts` and pass all 22 tests.
