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
export type FoodSource = "ai_photo" | "db_search" | "barcode" | "manual";
export type GoalType = "lose" | "maintain" | "gain";

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
  date: string;
  aiCount: number;
  bonusCount: number;
}

export interface PremiumState {
  active: boolean;
  expiresAt: number;
  lastOrderId: string;
}

export interface AppFlags {
  onboarded: boolean;
  aiNoticeAcknowledged: boolean;
  schemaVersion: 1;
}

export interface FoodCandidate {
  foodName: string;
  confidence: number;
  amountGram: number;
  kcal: number;
  carbG: number;
  proteinG: number;
  fatG: number;
}

export interface FoodDbItem {
  foodId: string;
  foodName: string;
  brand: string;
  servingGram: number;
  kcalPer100g: number;
  carbPer100g: number;
  proteinPer100g: number;
  fatPer100g: number;
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

export type ResultRouteState = {
  candidates: FoodCandidate[];
  mealType: MealType;
  source: FoodSource;
  editingId?: string;
};

export type RouteState = {
  "/": undefined;
  "/onboarding": undefined;
  "/capture": { mealType: MealType } | undefined;
  "/result": ResultRouteState;
  "/search": { mealType: MealType } | undefined;
  "/premium": undefined;
  "/report": undefined;
  "/settings": undefined;
  "/settings/goal": undefined;
};

// ============================================================================
// Storage Keys
// ============================================================================

exp
// ...truncated
```

## Existing Codebase (import and use these — do NOT recreate)
### File Tree (src/)
  App.tsx
  components/
    AdSlot.tsx
    AiBadge.tsx
    Amount.tsx
    BottomCTA.tsx
    CalorieRing.tsx
    Card.tsx
    CountUp.tsx
    FloatingTabBar.tsx
    MacroMiniBar.tsx
    MiniBar.tsx
    PageShell.tsx
    ScreenScaffold.tsx
    Sparkline.tsx
    StateView.tsx
    SummaryHero.tsx
    TossPurchase.tsx
    TossRewardAd.tsx
  data/
    __tests__/
    goalRepo.ts
    mealsRepo.ts
  hooks/
  lib/
    api.ts
    bootstrap.ts
    date.ts
    hooks.ts
    image.ts
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
- api.ts: export type ApiResult<T> = |; export async function analyzeImage( imageBase64: string, mealType: MealType ): Promise<ApiResult<FoodCandidate[]>>; export async function searchFoods( query: string, signal?: AbortSignal ): Promise<ApiResult<FoodDbItem[]>>
- bootstrap.ts: export function getQuota(): UsageQuota; export function isPremium(): boolean; export function bootstrap(): void
- date.ts: export function toKSTDate(date: Date): string; export function todayKST(): string; export function lastNDaysKST(n: number): string[]; export function inferMealType(date?: Date): MealType
- hooks.ts: export function useAppReady(): boolean; export function useMeals(); export function useGoal(); export function useQuota(); export function usePremium()
- image.ts: export type ResizeImageResult = |; export async function resizeImage(file: File): Promise<ResizeImageResult>
- storage.ts: export function getItem<T>(key: string): T | null; export function setItem<T>(key: string, value: T): void; export function removeItem(key: string): void; export function safeGet<T>(key: string, fallback: T): T; export function safeSet<T>(key: string, value: T): StorageResult; export function removeKey(key: string): void; export function clearAll(): void
- types.ts: export type MealType = "breakfast" | "lunch" | "dinner" | "snack"; export type FoodSource = "ai_photo" | "db_search" | "barcode" | "manual"; export type GoalType = "lose" | "maintain" | "gain"; export interface MealRecord; export interface UserGoal; export interface UsageQuota; export interface PremiumState; export interface AppFlags
- utils.ts: export function cn(...classes: (string | boolean | undefined | null)[]): string; export function formatNumber(n: number): string; export function formatCurrency(n: number, currency = 'KRW'): string

### Components (src/components/)
- AdSlot.tsx: AdSlot
- AiBadge.tsx: AiBadge
- Amount.tsx: Amount
- BottomCTA.tsx: SubmitFooter, ButtonStack
- CalorieRing.tsx: CalorieRing
- Card.tsx: Card
- CountUp.tsx: CountUp
- FloatingTabBar.tsx: FloatingTabBar
- MacroMiniBar.tsx: MacroMiniBar
- MiniBar.tsx: MiniBar
- PageShell.tsx: PageShell
- ScreenScaffold.tsx: ScreenScaffold
- Sparkline.tsx: Sparkline
- StateView.tsx: EmptyState, LoadingState
- SummaryHero.tsx: SummaryHero
- TossPurchase.tsx: TossPurchase
- TossRewardAd.tsx: TossRewardAd

### Module Dependencies (import graph)
  lib/api.ts → imports: lib/types
  lib/bootstrap.ts → imports: lib/storage, lib/date, lib/types, lib/types
  lib/date.ts → imports: lib/types
  lib/hooks.ts → imports: lib/storage, lib/types, lib/types, lib/bootstrap, lib/date
  lib/storage.ts → imports: lib/types
CRITICAL: Before creating any new function, type, or component, check the list above. If something similar exists, import and use it.

## Already Implemented (do NOT duplicate or overwrite)
- 0001: 도메인 타입 + RouteState 계약 정의 (files: src/lib/types.ts)
- 0002: 저장소 원시 유틸 + KST 날짜 유틸 (files: src/lib/storage.ts, src/lib/date.ts)
- 0005: 부트스트랩 + React 훅 계층 (files: src/lib/bootstrap.ts, src/lib/hooks.ts)
- 0006: 외부 API 클라이언트 (AI 인식 / 음식 검색) (files: src/lib/api.ts)
- 0008: 공용 표현 컴포넌트 (칼로리 링 / MacroMiniBar / AI 배지) (files: src/components/CalorieRing.tsx, src/components/MacroMiniBar.tsx, src/components/AiBadge.tsx)
- heal-1-01: 0007 이미지 리사이즈 유틸 — 광범위 호환 Canvas 구현으로 최소 수복 (files: src/utils/image.ts, src/utils/__tests__/image.test.ts)
- heal-1-02: 0003 도메인 리포지토리 — meals / goal (검증 포함) (files: src/data/mealsRepo.ts, src/data/goalRepo.ts, src/data/__tests__/mealsRepo.test.ts, src/data/__tests__/goalRepo.test.ts)
- heal-1-03: 0004 도메인 리포지토리 — quota / premium / flags / recentFoods (files: src/data/quotaRepo.ts, src/data/premiumRepo.ts, src/data/flagsRepo.ts, src/data/recentFoodsRepo.ts, src/data/__tests__/quotaRepo.test.ts, src/data/__tests__/premiumRepo.test.ts)
- heal-2-01: 하단 계층 테스트 스위트 복구 — 품질 게이트 GREEN 전환 (files: src/domain/repositories/mealRepository.ts, src/domain/repositories/goalRepository.ts, src/domain/repositories/quotaRepository.ts, src/domain/repositories/premiumRepository.ts, src/domain/repositories/flagsRepository.ts, src/domain/repositories/recentFoodsRepository.ts, src/lib/storage.ts, src/lib/date.ts, src/domain/repositories/__tests__/repositories.test.ts, src/test/setup.ts)
- heal-2-02: skipped 패킷 재활성화 — 상위 화면·로직 계층 unblock (files: src/domain/report/aggregate.ts, docs/packet-status.md)