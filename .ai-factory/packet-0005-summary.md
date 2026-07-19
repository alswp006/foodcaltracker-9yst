# Packet 0005: Bootstrap + React Hooks Layer (TDD Red Phase)

## Test File
- **Location**: `src/__tests__/packet-0005.test.ts`
- **Status**: ALL 27 TESTS FAILING (expected — red phase)
- **Run command**: `npx vitest run src/__tests__/packet-0005.test.ts`

## Files to Implement
1. **`src/lib/bootstrap.ts`** — initialization function
2. **`src/lib/hooks.ts`** — 5 React hooks layer

---

## Test Breakdown by Acceptance Criteria

### AC-1: bootstrap() Schema Migration (4 tests)
**File**: `src/lib/bootstrap.ts`

```typescript
export function bootstrap(): void
```

**Expected behavior**:
- If `flags.schemaVersion !== 1` (e.g., = 2 for old schema):
  - Reset all 6 storage keys to **default values**
  - Call `getQuota()` and `isPremium()` once each
  - Set `flags.schemaVersion = 1` in storage
  
- If `flags.schemaVersion === 1`:
  - No-op (do not reinitialize existing data)

**Storage keys to initialize** (from `STORAGE_KEYS`):
1. `fct:meals` → `[]`
2. `fct:goal` → `DEFAULT_GOAL`
3. `fct:quota` → `DEFAULT_QUOTA`
4. `fct:premium` → `DEFAULT_PREMIUM`
5. `fct:flags` → `{...DEFAULT_FLAGS, schemaVersion: 1}`
6. `fct:recentFoods` → `[]`

**Tests**:
- ✗ should initialize all 6 storage keys with default values when flags.schemaVersion=2
- ✗ should reset all keys to defaults even if partial data exists
- ✗ should call getQuota() and isPremium() once during bootstrap
- ✗ should not reinitialize when flags.schemaVersion=1

---

### AC-2: useAppReady() Hook (3 tests)
**File**: `src/lib/hooks.ts`

```typescript
export function useAppReady(): boolean
```

**Expected behavior**:
- Returns `false` if `flags` do not exist or `schemaVersion !== 1`
- Returns `true` if `flags.schemaVersion === 1` (bootstrap completed)
- Used to gate app UI until initialization is done

**Tests**:
- ✗ should return false before bootstrap() is called
- ✗ should return true after bootstrap() completes and flags.schemaVersion=1
- ✗ should return false if flags do not exist (uninitialized state)

---

### AC-3: useMeals() Hook (3 tests)
**File**: `src/lib/hooks.ts`

```typescript
export function useMeals(): {
  todayMeals: MealRecord[];
  remove(id: string): void;
}
```

**Expected behavior**:
- `todayMeals`: array of meals matching **today's date** (from `STORAGE_KEYS.meals`)
- `remove(id)`: deletes meal by id, updates localStorage, triggers re-render
- Filters meals by current date automatically

**Tests**:
- ✗ should return empty todayMeals array initially
- ✗ should remove a meal by id and decrement length by 1 on next render
- ✗ should filter todayMeals to current date only

---

### AC-4: useQuota() Hook (5 tests)
**File**: `src/lib/hooks.ts`

```typescript
export function useQuota(): {
  remaining: number;
  // plus aiCount, bonusCount, date as needed
}
```

**Expected behavior**:
- Reads quota from `STORAGE_KEYS.quota`
- **Calculates**: `remaining = 3 + bonusCount - aiCount`
  - Base free daily uses: 3
  - Bonus from reward ads: `bonusCount`
  - Already used: `aiCount`
- Resets quota if date boundary crossed (today's date != stored date)

**Test cases**:
- ✗ remaining=0 when aiCount=3, bonusCount=0  (3+0-3=0)
- ✗ remaining=2 when aiCount=3, bonusCount=2  (3+2-3=2)
- ✗ remaining=3 when aiCount=0, bonusCount=0  (3+0-0=3)
- ✗ remaining=5 when aiCount=1, bonusCount=3  (3+3-1=5)
- ✗ should handle quota reset at date boundary

---

### AC-5: useGoal() Hook (4 tests) + usePremium() Hook (3 tests)
**File**: `src/lib/hooks.ts`

```typescript
export function useGoal(): {
  goal: UserGoal;
  save(newGoal: UserGoal): void;
}

export function usePremium(): PremiumState
```

**useGoal() expected behavior**:
- Reads goal from `STORAGE_KEYS.goal`
- `save(newGoal)`: persists to localStorage, updates hook state
- Automatically updates `updatedAt` timestamp on save

**usePremium() expected behavior**:
- Returns premium state from `STORAGE_KEYS.premium`
- Reflects `active`, `expiresAt`, `lastOrderId`
- Can check if expired: `expiresAt < Date.now()`

**Tests**:
- ✗ useGoal: should return DEFAULT_GOAL initially
- ✗ useGoal: should save new goal and reflect in hook state
- ✗ useGoal: should persist goal to localStorage on save
- ✗ useGoal: should update updatedAt timestamp on save
- ✗ usePremium: should return inactive premium state initially
- ✗ usePremium: should reflect premium active state
- ✗ usePremium: should check expiration status

---

### AC-6: Implementation Constraints (3 tests)
**Expected**:
- ✗ Use only `useState` / `useCallback` — **NO external state library** (Redux, Zustand, etc.)
- ✗ Pass `npx tsc --noEmit` — zero TypeScript errors
- ✗ No SDK imports in hooks (`@apps-in-toss`, `@toss/*` forbidden in hooks layer)

---

## Integration Tests (2 tests)
- ✗ should bootstrap and make useAppReady return true
- ✗ should initialize all hooks after bootstrap

---

## Implementation Notes for the Coder

### Storage Helpers
Use existing `src/lib/storage.ts`:
```typescript
import { getItem, setItem, safeGet } from "@/lib/storage";

// Read
const goal = getItem<UserGoal>(STORAGE_KEYS.goal);

// Write
setItem(STORAGE_KEYS.goal, newGoal);
```

### Date Handling
- Get today's date in `YYYY-MM-DD` format (Korea Standard Time):
  ```typescript
  const todayStr = new Date().toISOString().split("T")[0];
  ```
- Filter meals: `meals.filter(m => m.date === todayStr)`

### No External State Library
- Use vanilla React only: `useState`, `useCallback`, `useRef`
- For bootstrap async calls (`getQuota`, `isPremium`), can use `useEffect` in a wrapper or call synchronously if available

### Today's Meals Filter
- `useMeals().todayMeals` must auto-filter by current date
- Consider memoization: `useMemo(() => meals.filter(...), [meals])`

### Quota Reset Logic
Example:
```typescript
const stored = getItem<UsageQuota>(STORAGE_KEYS.quota);
const today = getTodayStr();

if (!stored || stored.date !== today) {
  // Reset for new day
  const newQuota = { ...DEFAULT_QUOTA, date: today };
  setItem(STORAGE_KEYS.quota, newQuota);
  return newQuota;
}
return stored;
```

---

## Files NOT to Modify
- `src/lib/types.ts` — types are locked (packet-0001)
- `src/lib/storage.ts` — storage helpers are locked (packet-0002)
- All CLAUDE.md rules + .claude/rules/ apply

---

## Verification Checklist Before Submitting
1. [ ] `npx vitest run src/__tests__/packet-0005.test.ts` → all 27 tests pass ✓
2. [ ] `npx tsc --noEmit` → zero errors
3. [ ] No imports from Redux, Zustand, Recoil, or any external state library
4. [ ] No imports from `@apps-in-toss/*` or `@toss/*` in bootstrap.ts / hooks.ts
5. [ ] localStorage reads/writes use the `src/lib/storage` helpers
6. [ ] Today's date filtering works for `useMeals().todayMeals`
7. [ ] `useQuota().remaining` formula: `3 + bonusCount - aiCount`
8. [ ] All 6 storage keys initialized on first bootstrap

---

## Key Formulas & Constants

| Constant | Value |
|----------|-------|
| Base free daily quota | 3 uses/day |
| Quota remaining formula | `3 + bonusCount - aiCount` |
| Default daily kcal goal | 2000 |
| Default macro ratios | 50% carbs, 30% protein, 20% fat |
| Premium expiry check | `expiresAt < Date.now()` |
| Meals storage key | `fct:meals` |
| Storage key prefix | `fct:` |

---

End of TDD Red Phase Documentation.
Coder: Implement `src/lib/bootstrap.ts` and `src/lib/hooks.ts` to make all tests pass.
