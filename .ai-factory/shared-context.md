# Shared Context (auto-generated — do NOT modify)


## Shared Types Contract (IMPORT these, do NOT redefine)
```typescript
// FoodCalTracker Domain Types & Constants
// This file defines all domain entities, enums, and route state contracts
// No function implementations — pure type & constant definitions only

// ============================================================================
// Enum Literal Types
// ============================================================================

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type FoodSource = "user_input" | "ai_generated" | "food_db";
export type GoalType = "maintain" | "gain" | "lose";

// ============================================================================
// Domain Entity Types
// ============================================================================

export interface MealRecord {
  id: string;
  date: string;
  createdAt: number;
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
}

export interface UserGoal {
  dailyKcal: number;
  goalType: GoalType;
  carbRatio: number;
  proteinRatio: number;
  fatRatio: number;
  updatedAt: number;
}

export interface UsageQuota {
  aiCount: number;
  aiCountLimit: number;
  lastResetDate: string;
}

export interface PremiumState {
  active: boolean;
  expiresAt: number | null;
  purchaseDate: number | null;
}

export interface AppFlags {
  schemaVersion: number;
  aiNoticeDismissed: boolean;
  preferredLanguage: string;
}

export interface FoodCandidate {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  unit: string;
}

export interface FoodDbItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: string;
  source: string;
}

// ============================================================================
// Result/Response Types
// ============================================================================

export type StorageResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; error: "STORAGE_FULL" | "INVALID_INPUT" };

// ============================================================================
// Navigation Route State Contract
// ============================================================================

export interface ResultRouteState {
  runId: string;
}

export type RouteState = ResultRouteState | undefined;

// ============================================================================
// Storage Keys
// ============================================================================

export const STORAGE_KEYS = {
  meals: "fct:meals",
  goal: "fct:goal",
  quota: "fct:quota",
  premium: "fct:premium",
  flags: "fct:flags",
  recentFoods: "fct:recentFoods",
} as const;

// ============================================================================
// Default Values
// =================================================================
// ...truncated
```

## Existing Codebase (import and use these — do NOT recreate)
### File Tree (src/)
  App.tsx
  components/
    AdSlot.tsx
    Amount.tsx
    BottomCTA.tsx
    Card.tsx
    CountUp.tsx
    FloatingTabBar.tsx
    MiniBar.tsx
    PageShell.tsx
    ScreenScaffold.tsx
    Sparkline.tsx
    StateView.tsx
    SummaryHero.tsx
    TossPurchase.tsx
    TossRewardAd.tsx
  hooks/
  lib/
    storage.ts
    types.ts
    utils.ts
  main.tsx
  pages/
    Home.tsx
    __TdsGallery.tsx
  styles/
    globals.css
    reward-ad.css
  types/
  vite-env.d.ts

### Exports (src/lib/)
- storage.ts: export function getItem<T>(key: string): T | null; export function setItem<T>(key: string, value: T): void; export function removeItem(key: string): void
- types.ts: export type MealType = "breakfast" | "lunch" | "dinner" | "snack"; export type FoodSource = "user_input" | "ai_generated" | "food_db"; export type GoalType = "maintain" | "gain" | "lose"; export interface MealRecord; export interface UserGoal; export interface UsageQuota; export interface PremiumState; export interface AppFlags
- utils.ts: export function cn(...classes: (string | boolean | undefined | null)[]): string; export function formatNumber(n: number): string; export function formatCurrency(n: number, currency = 'KRW'): string

### Components (src/components/)
- AdSlot.tsx: AdSlot
- Amount.tsx: Amount
- BottomCTA.tsx: SubmitFooter, ButtonStack
- Card.tsx: Card
- CountUp.tsx: CountUp
- FloatingTabBar.tsx: FloatingTabBar
- MiniBar.tsx: MiniBar
- PageShell.tsx: PageShell
- ScreenScaffold.tsx: ScreenScaffold
- Sparkline.tsx: Sparkline
- StateView.tsx: EmptyState, LoadingState
- SummaryHero.tsx: SummaryHero
- TossPurchase.tsx: TossPurchase
- TossRewardAd.tsx: TossRewardAd
CRITICAL: Before creating any new function, type, or component, check the list above. If something similar exists, import and use it.

## Already Implemented (do NOT duplicate or overwrite)
- 0001: 도메인 타입 + RouteState 계약 정의 (files: src/lib/types.ts)
- 0002: 저장소 원시 유틸 + KST 날짜 유틸 (files: src/lib/storage.ts, src/lib/date.ts)
- 0006: 외부 API 클라이언트 (AI 인식 / 음식 검색) (files: src/lib/api.ts)