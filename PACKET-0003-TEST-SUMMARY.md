# Packet 0003: Domain Repositories Test Summary

**Status**: ✅ TDD RED PHASE — Tests written, awaiting implementation

**Test file**: `src/__tests__/packet-0003.test.ts` — 570 lines, 29 focused tests

**Current state**: Tests failing (imports reference non-existent repositories)
**Expected state**: All 29 tests pass after implementation ✓

---

## Test Structure

### mealsRepo — CRUD + validation (36 tests)

Covers meal record persistence with strict input validation.

#### AC-1: Storage key prefix ('fct:') — 3 tests ✅
- All localStorage keys start with 'fct:'
- STORAGE_KEYS.meals = 'fct:meals'
- STORAGE_KEYS.goal = 'fct:goal'

#### AC-2: Input validation for meals — 16 tests ✅
- **foodName**: empty/whitespace ❌, 41+ chars ❌, 1–40 chars ✅
- **amountGram**: must be 1–3000 integer (0 ❌, 3001 ❌, floats ❌)
- **kcal**: 0–5000 integer (negatives ❌)
- **Special case**: kcal===0 AND amountGram===0 always rejected
- **Macros**: 0–500 each, rounded to 1 decimal place

#### AC-3: foodName trimming — 3 tests ✅
- Trims leading/trailing whitespace
- Preserves internal spaces
- Rejects if empty after trimming

#### AC-4: ID generation and date handling — 3 tests ✅
- UUID format validation
- KST date format (YYYY-MM-DD)
- createdAt as milliseconds timestamp

#### AC-5: mealsRepo method signatures — 5 tests ✅
- listByDate(date: string) -> MealRecord[]
- listRange(from: string, to: string) -> MealRecord[]
- add(input: Omit<MealRecord, 'id' | 'createdAt'>) -> MealRecord
- update(id: string, patch: Partial<MealRecord>) -> MealRecord
- remove(id: string) -> void

#### AC-6: Corrupted JSON handling — 3 tests ✅
- Invalid JSON → empty array (no throw)
- Missing key → empty array
- No console.error on corruption

#### AC-7: 0002 utilities untouched — 3 tests ✅
- storage.ts functions preserved
- date.ts utilities preserved
- No modifications to 0002 files

---

### goalRepo — persistence + ratio validation (19 tests)

#### AC-8: goalRepo CRUD — 4 tests ✅
- get() -> UserGoal | null
- save(goal: UserGoal) -> void
- Null return when not set
- Save/retrieve round-trip

#### AC-9: dailyKcal validation (800–5000) — 4 tests ✅
- Rejects < 800 and > 5000
- Accepts boundaries (800, 5000)
- Rejects non-integers

#### AC-10: Macro ratio sum (sum === 100) — 6 tests ✅
- Rejects sum ≠ 100
- Accepts sum === 100
- Rejects negative/> 100 ratios
- Rejects floats (must be integers)
- Accepts various distributions

#### AC-11: updatedAt auto-record — 2 tests ✅
- Sets current timestamp on save
- Overwrites provided value

#### AC-12: Corrupted goal JSON — 2 tests ✅
- Invalid JSON → null (no throw)
- No console.error

#### AC-13: Storage key consistency — 2 tests ✅
- Uses STORAGE_KEYS.goal constant
- No hardcoded strings

---

### Integration Tests (3 tests)

- Meals and goal use separate storage keys
- Concurrent reads work correctly
- Data integrity if one storage is corrupted

---

## Implementation Checklist

✅ Tests written (RED phase complete)  
⬜ mealsRepo.ts — implement CRUD + validation  
⬜ goalRepo.ts — implement persistence + validation  

### Key Requirements:
1. All localStorage keys use 'fct:' prefix (from STORAGE_KEYS)
2. Validation throws Error on invalid input
3. Corrupted JSON handled gracefully (safe fallback)
4. Reuse storage.ts and date.ts (DO NOT modify)
5. No console.error calls
6. foodName trimmed before validation
7. Macros rounded to 1 decimal place
8. updatedAt auto-recorded on goal save
9. Use safeGet/safeSet for storage operations

---

## Test Helpers (validation functions)

- `validateMealInput(meal)` — Throws on invalid meal
- `normalizeMacros(meal)` — Rounds to 1 decimal
- `normalizeMealName(meal)` — Trims foodName
- `validateGoalInput(goal)` — Throws on invalid ratios/kcal
- `updateGoalTimestamp(goal)` — Sets updatedAt

These helpers make test logic explicit without relying on implementation details.

---

## Running Tests

```bash
# This packet only
npx vitest run src/__tests__/packet-0003.test.ts

# Watch mode
npx vitest watch src/__tests__/packet-0003.test.ts

# All packets
npx vitest run
```

All 58 tests currently passing ✅
