# TASK — FoodCalTracker

## Epic 1. 타입 정의

**Risk Assessment**
- Complexity: Low
- Risk factors: RouteState 계약이 불완전하면 `/result`·`/capture`·`/search` 간 state 형태가 어긋나 런타임 undefined 크래시 발생. 도메인 타입 누락 시 후속 패킷이 각자 타입을 재정의해 중복·불일치.
- Mitigation: 모든 엔티티 + RouteState를 **최초 패킷**에서 단일 파일로 확정. 이후 모든 패킷은 이 파일만 import하므로 정의가 하나뿐이다.

### Task 1.1 도메인 타입 + RouteState 계약 정의
- Description: `src/lib/types.ts`에 모든 엔티티 타입(MealRecord, UserGoal, UsageQuota, PremiumState, AppFlags, FoodCandidate, FoodDbItem)과 열거형(MealType, FoodSource, GoalType), API 요청/응답 타입(AnalyzeRequest, AnalyzeResponse, SearchResponse), 저장 결과 타입(`StorageResult = { ok: true; data?: T } | { ok: false; error: 'STORAGE_FULL' | 'INVALID_INPUT' }`), 그리고 페이지 간 네비게이션 계약인 `RouteState`를 정의한다. 런타임 코드 없이 순수 타입만. localStorage 키 상수(`STORAGE_KEYS`)와 기본값 상수(`DEFAULT_GOAL`, `DEFAULT_FLAGS`, `DEFAULT_QUOTA`, `DEFAULT_PREMIUM`)도 함께 export.
- RouteState 계약(필수 형태):
```ts
export type ResultRouteState = {
  candidates: FoodCandidate[];
  mealType: MealType;
  source: FoodSource;
  editingId?: string;
};
export type RouteState = {
  '/': undefined;
  '/onboarding': undefined;
  '/capture': { mealType: MealType } | undefined;
  '/result': ResultRouteState;
  '/search': { mealType: MealType } | undefined;
  '/premium': undefined;
  '/report': undefined;
  '/settings': undefined;
  '/settings/goal': undefined;
};
```
- DoD:
  - `src/lib/types.ts`가 위 9개 인터페이스 + 3개 열거형 + RouteState를 export하고 `tsc --noEmit` 통과
  - `STORAGE_KEYS`가 `{ meals: 'fct:meals', goal: 'fct:goal', quota: 'fct:quota', premium: 'fct:premium', flags: 'fct:flags', recentFoods: 'fct:recentFoods' }` 로 정의됨
  - `DEFAULT_GOAL`이 `{ dailyKcal: 2000, goalType: 'maintain', carbRatio: 50, proteinRatio: 30, fatRatio: 20, updatedAt: 0 }`
  - 파일에 `import` 문 외 실행 가능한 로직(함수 본문) 0개
  - HEX 색상 문자열 0개
- Covers: [F1-AC1(타입), F1-AC4(기본값), F5-AC6(state 계약), S2/S3/S4/S5/S7 Navigation state contract]
- Files: `src/lib/types.ts`
- Depends on: none

---

## Epic 2. 데이터 계층

**Risk Assessment**
- Complexity: Medium
- Risk factors: (a) `QuotaExceededError` 처리 누락 시 저장 실패가 조용히 삼켜짐 — 5MB 상한 대비 필요. (b) KST 날짜 계산을 `new Date().toISOString()`으로 하면 UTC 기준이 되어 하루 경계가 9시간 어긋남. (c) 손상 JSON 파싱 시 `console.error` 호출하면 AC-G2 위반으로 검수 반려. (d) `Array.prototype.at` / `structuredClone` 사용 시 Android 7 크래시.
- Mitigation: Task 2.1에서 KST 유틸과 safe-parse를 **먼저** 격리 구현하고 이후 리포지토리가 이를 재사용. Task 2.2(리포지토리)는 순수 함수만 다뤄 UI 없이 검증 가능. Task 2.3(훅)은 리포지토리 위에만 얹어 상태 동기화 책임을 분리. Task 2.4(API 클라이언트)를 별도로 분리해 네트워크 실패 처리가 페이지 패킷에 섞이지 않게 한다.

### Task 2.1 저장소 원시 유틸 + KST 날짜 유틸
- Description: `src/lib/storage.ts`에 localStorage 원시 래퍼를 구현한다. `safeGet<T>(key, fallback): T`(JSON 파싱 실패 시 `console.error` 없이 fallback 반환), `safeSet(key, value): { ok: boolean; error?: 'STORAGE_FULL' }`(try/catch로 `QuotaExceededError` 포착), `removeKey(key)`, `clearAll()`. 별도로 `src/lib/date.ts`에 KST 유틸 구현: `todayKST(): string`(UTC+9 오프셋을 수동 가산해 'YYYY-MM-DD' 반환), `toKSTDate(epochMs): string`, `lastNDaysKST(n): string[]`(오늘 포함 최근 n일 배열, 오름차순), `inferMealType(epochMs): MealType`(04–10 breakfast / 10–15 lunch / 15–21 dinner / 그 외 snack, KST 시각 기준).
- DoD:
  - `safeGet('fct:goal', DEFAULT_GOAL)`이 값 `'{broken'` 상황에서 예외 없이 `DEFAULT_GOAL` 반환
  - 전체 파일에 `console.error` / `console.warn` 호출 0개
  - `safeSet`이 `QuotaExceededError` 발생 시 throw하지 않고 `{ ok: false, error: 'STORAGE_FULL' }` 반환
  - `todayKST()`가 UTC 15:00~23:59 구간에서도 다음날 KST 날짜를 반환 (테스트: `toKSTDate(Date.UTC(2026,6,19,15,30))` === `'2026-07-20'`)
  - `Array.prototype.at`, `Object.groupBy`, `structuredClone`, `findLast` 사용 0개
- Covers: [F1-AC4, F1-AC5(원시 계층), AC-G2, AC-G4, Assumption 6(KST)]
- Files: `src/lib/storage.ts`, `src/lib/date.ts`
- Depends on: Task 1.1

### Task 2.2 도메인 리포지토리 (meals / goal / quota / premium / flags)
- Description: `src/lib/repositories.ts`에 도메인별 CRUD를 구현한다.
  - meals: `getAllMeals()`, `getMealsByDate(date)`, `addMeal(input)`, `updateMeal(id, patch)`, `deleteMeal(id)`, `pruneOldMeals(count)`
  - goal: `getGoal()`, `setGoal(goal)`
  - quota: `getQuota()`(날짜 불일치 시 `{ date: todayKST(), aiCount: 0, bonusCount: 0 }`로 리셋 후 저장), `incrementAiCount()`, `addBonusCount()`(당일 최대 2)
  - premium: `getPremium()`, `isPremium()`(만료 시 `active: false`로 갱신 후 false 반환), `grantPremium(orderId)`(기존 `expiresAt`이 미래면 그 값 기준 +30일, 아니면 현재 시각 기준 +30일), `daysUntilExpiry()`
  - flags: `getFlags()`, `setFlag(key, value)`
  - recentFoods: `getRecentFoods()`, `pushRecentFood(item)`(중복은 앞으로 이동, 30건 초과 시 마지막 제거)
  `addMeal`은 입력 검증(`foodName.trim().length` 1~40, `amountGram` 1~3000 정수, `kcal` 0~5000) 실패 시 `{ ok: false, error: 'INVALID_INPUT' }`, `STORAGE_FULL` 시 오래된 500건 삭제 후 1회 재시도.
- DoD:
  - `addMeal({ mealType:'lunch', foodName:'된장찌개', amountGram:400, kcal:210, carbG:18, proteinG:12.5, fatG:9, source:'ai_photo', aiGenerated:true })` 호출 후 `getMealsByDate(todayKST())`가 길이 1 배열 반환, 항목에 UUID `id`·KST `date`·`createdAt` 자동 부여됨
  - `addMeal({ foodName:'   ', amountGram:0, kcal:0, ... })`가 저장하지 않고 `{ ok: false, error: 'INVALID_INPUT' }` 반환
  - `fct:quota = { date:'2026-07-19', aiCount:3, bonusCount:1 }` 상태에서 2026-07-20에 `getQuota()` 호출 시 `{ date:'2026-07-20', aiCount:0, bonusCount:0 }` 반환 + localStorage 반영 확인
  - `fct:premium = { active:true, expiresAt:과거시각 }` 에서 `isPremium()` → `false` 반환 및 저장값 `active:false`로 갱신
  - `grantPremium('ord_x')`를 만료 5일 남은 상태에서 호출 시 `expiresAt === 기존expiresAt + 30*24*3600*1000`
  - `addBonusCount()`를 3회 연속 호출해도 `bonusCount` 최대 2
  - `pushRecentFood`를 31개 서로 다른 항목으로 호출 후 배열 길이 30, 최신 항목이 index 0
  - `console.error` 호출 0개
- Covers: [F1-AC1, F1-AC2, F1-AC3, F1-AC5, F1-AC6, F6-AC2(recentFoods), F7-AC1, F7-AC2, F7-AC7(daysUntilExpiry)]
- Files: `src/lib/repositories.ts`
- Depends on: Task 2.1

### Task 2.3 부트스트랩 + React 훅 계층
- Description: `src/lib/bootstrap.ts`에 `bootstrap()`을 구현한다 — `fct:flags.schemaVersion !== 1`이면 6개 키 전체를 기본값으로 초기화, 이어서 `getQuota()`(일일 리셋)와 `isPremium()`(만료 판정)을 1회씩 호출. `src/lib/hooks.ts`에 `useAppReady()`(bootstrap 완료 여부 boolean), `useMeals()`(`meals`, `todayMeals`, `add`, `remove`, `update` — 변경 시 리렌더), `useGoal()`(`goal`, `save`), `useQuota()`(`quota`, `useAi`, `grantBonus`, `remaining` — `remaining = 3 + bonusCount - aiCount`), `usePremium()`(`premium`, `active`, `grant`, `daysLeft`)를 구현. 훅은 React `useState` + `useCallback` 기반의 얇은 래퍼로, 리포지토리 호출 후 로컬 state를 갱신해 홈 링이 즉시 재계산되도록 한다.
- DoD:
  - `bootstrap()`이 `schemaVersion: 2`인 flags 상태에서 6개 키 전부를 기본값으로 재초기화
  - `useAppReady()`가 bootstrap 완료 전 `false`, 완료 후 `true` 반환
  - `useMeals().remove(id)` 호출 직후 동일 렌더 사이클에서 `todayMeals` 길이가 1 감소
  - `useQuota().remaining`이 `{ aiCount: 3, bonusCount: 0 }` 상태에서 `0` 반환
  - `useGoal().save({ dailyKcal: 1800, ... })` 이후 `goal.dailyKcal === 1800`
  - 모든 훅이 순수 React API만 사용(외부 상태 라이브러리 미도입), `tsc --noEmit` 통과
- Covers: [F1-AC7, F1-AC8, F2-AC7(즉시 반영), F3-AC5(즉시 재계산)]
- Files: `src/lib/bootstrap.ts`, `src/lib/hooks.ts`
- Depends on: Task 2.2

### Task 2.4 외부 API 클라이언트
- Description: `src/lib/api.ts`에 외부 Railway API 호출 함수를 구현한다. `analyzeImage(imageBase64, mealType): Promise<{ ok: true; items: FoodCandidate[] } | { ok: false; error: string; message: string }>` — `POST ${VITE_API_BASE_URL}/api/vision/analyze`, `AbortController` 기반 15초 타임아웃, 에러 코드별 한국어 메시지 매핑(INVALID_IMAGE/IMAGE_TOO_LARGE/NO_FOOD_DETECTED/RATE_LIMITED/INTERNAL_ERROR/NETWORK). `searchFoods(q, signal): Promise<{ ok: true; foods: FoodDbItem[] } | { ok: false; error: string; message: string }>` — `GET .../api/foods/search?q={encodeURIComponent(q)}&limit=20`, 외부 `AbortController` signal 수용. 별도로 `src/lib/image.ts`에 `resizeImage(file): Promise<{ ok: true; base64: string } | { ok: false; error: 'TOO_LARGE' }>` — canvas로 최대 변 1280px, JPEG 품질 0.7 리사이즈, 결과 2MB 초과 시 실패 반환, 처리 후 ObjectURL revoke 및 canvas 참조 해제.
- DoD:
  - `analyzeImage`가 15초 초과 시 `{ ok: false, error: 'NETWORK', message: '네트워크 연결을 확인해주세요' }` 반환 (throw 없음)
  - 서버 `422 { error: 'NO_FOOD_DETECTED' }` 응답 시 `message === '음식을 찾지 못했어요. 다시 찍거나 직접 검색해보세요'`
  - 서버 `200 { items: [] }` 응답도 `NO_FOOD_DETECTED`와 동일 메시지로 정규화
  - `searchFoods`가 전달받은 signal로 abort될 때 예외를 밖으로 던지지 않고 조용히 무시
  - 요청 URL이 항상 `limit=20` 고정 포함
  - `resizeImage`가 8MB JPEG 입력에 대해 2MB 이하 base64 반환, 리사이즈 후에도 2MB 초과면 `{ ok: false, error: 'TOO_LARGE' }`
  - `console.error` 호출 0개, `window.open`/`window.location.href` 0개
- Covers: [F4-AC7, F4-AC8, F4-AC9, F4-AC10, F6-AC1(호출 계약), F6-AC6, F6-AC7, F6-AC8, AC-G1, AC-G2, AC-G3]
- Files: `src/lib/api.ts`, `src/lib/image.ts`
- Depends on: Task 1.1

---

## Epic 3. 표현 컴포넌트

**Risk Assessment**
- Complexity: Medium
- Risk factors: 칼로리 링·MiniBar·Sparkline은 TDS 미제공이라 커스텀 SVG가 필요 — HEX 하드코딩 시 AC-G8 위반 및 다크모드 붕괴. 여러 페이지가 동일 시각 요소를 각자 구현하면 스타일 불일치.
- Mitigation: 페이지 패킷보다 **먼저** 공용 표현 컴포넌트를 한 번만 만들고 CSS 변수만 사용하도록 DoD에 고정. 홈·결과·리포트 3개 페이지가 이를 재사용한다.

### Task 3.1 공용 표현 컴포넌트 (링 / MiniBar / Sparkline / AI 배지)
- Description: `src/components/CalorieRing.tsx`(SVG 도넛, props: `consumed`, `target`; 진행률 반올림 %, 초과 시 100% 채움 + "{n}kcal 초과" 텍스트를 `var(--tds-color-red-500)`로, 정상 시 잔여 kcal CountUp을 t2 타이포로 중앙 표시, `data-testid="calorie-ring"`, 중앙 탭 영역 88×88px), `src/components/MacroBars.tsx`(탄단지 MiniBar 3개, props: `intake:{carbG,proteinG,fatG}`, `goal:UserGoal`; 각 목표 대비 % 수치 표기, `data-testid="macro-bars"`), `src/components/Sparkline.tsx`(SVG 폴리라인, props: `values: number[]`, `goalLine: number`), `src/components/AiBadge.tsx`(props: `compact?: boolean`; 기본 "AI가 생성한 결과입니다", compact면 "AI", `data-testid="ai-badge"`)를 구현한다. 모든 색상은 `var(--tds-color-*)`만 사용.
- DoD:
  - `<CalorieRing consumed={730} target={1600} />` 렌더 시 `data-testid="calorie-ring"` 내부에 `730`, `870`, `46%` 존재
  - `<CalorieRing consumed={1850} target={1600} />` 렌더 시 링 진행률 100%, "250kcal 초과" 텍스트 존재
  - `<CalorieRing consumed={0} target={2000} />` 렌더 시 잔여값 `2000` 표시
  - `target`이 `0`일 때 `NaN`/`Infinity` 미노출 (기본 2000 사용)
  - `grep -rE "#[0-9a-fA-F]{3,8}\b" src/components/` 매치 0
  - `<AiBadge compact />` 렌더 텍스트가 정확히 `AI`
- Covers: [F3-AC1, F3-AC2, F3-AC4, F5-AC3, F8-AC8, AC-G8, AC-G10]
- Files: `src/components/CalorieRing.tsx`, `src/components/MacroBars.tsx`, `src/components/Sparkline.tsx`, `src/components/AiBadge.tsx`
- Depends on: Task 1.1

### Task 3.2 리포트 집계 로직
- Description: `src/lib/report.ts`에 순수 집계 함수를 구현한다. `buildWeeklyReport(meals: MealRecord[], goal: UserGoal): WeeklyReport` — 최근 7일(오늘 포함) 일자별 kcal 합계 배열, 일평균 kcal(총합/7 반올림), 목표 달성일 수(일별 합계가 `dailyKcal ±10%` 범위 내인 날 수), 탄단지 평균 g, TOP 3 음식(빈도 내림차순, 동률은 `foodName` 가나다순 `localeCompare('ko')`), 총 기록 건수. `kcal`/`carbG` 등이 `NaN`·`null`·`undefined`인 항목은 집계에서 제외. `goal.dailyKcal`이 0 이하·NaN이면 2000을 사용.
- DoD:
  - 일별 kcal이 `[1500,1800,0,1650,2100,1400,1600]`, `dailyKcal=1600`일 때 `avgKcal === 1436`, `achievedDays === 3`
  - `kcal: NaN` 항목 1건 포함 시 크래시 없이 나머지로 집계, 결과에 `NaN` 없음
  - `dailyKcal: 0`일 때 `Infinity`/`NaN` 미포함
  - 빈도 `{비빔밥:4, 아메리카노:3, 된장찌개:3, 샐러드:1}`에서 TOP3 순서가 `비빔밥, 아메리카노, 된장찌개`
  - 기록 0건 입력 시 `totalCount === 0` 반환, 예외 없음
  - `Object.groupBy` / `Array.prototype.at` 사용 0개
- Covers: [F8-AC1, F8-AC3, F8-AC7, F8-AC8, AC-G4]
- Files: `src/lib/report.ts`
- Depends on: Task 1.1

---

## Epic 4. 페이지 (1 패킷 = 1 페이지)

**Risk Assessment**
- Complexity: High
- Risk factors: (a) 페이지가 `location.state`를 임의 형태로 읽어 undefined 크래시. (b) TDS 컴포넌트에 Tailwind padding을 덮어써 검수 반려. (c) 한 패킷에 촬영+분석+쿼터게이트+광고를 몰면 10분 초과. (d) 홈 120건 렌더 시 DOM 폭증.
- Mitigation: 모든 페이지가 Task 1.1의 `RouteState`를 import해 `location.state as RouteState['/result']` 형태로 캐스팅하도록 DoD에 명시. 페이지당 1패킷으로 분리하고, 촬영 페이지는 쿼터 게이트(4.4)를 별도 패킷으로 떼어냄. 데이터 계층·표현 컴포넌트가 모두 선행되므로 페이지 패킷은 조립만 담당한다.

### Task 4.1 온보딩 + 목표 수정 화면
- Description: `src/pages/OnboardingPage.tsx`를 구현한다. `ScreenScaffold` > `Top`("목표를 알려주세요") > goalType `Chip` 3개(감량/유지/증량, 높이 48px) > `Card`(dailyKcal TextField, `inputMode="numeric"`) > `Card`(탄·단·지 비율 TextField ×3) > `SubmitFooter`("시작하기", `display="block"`, 높이 56px). Chip 선택 시 dailyKcal 프리셋 자동 입력(감량 1600 / 유지 2000 / 증량 2400). 검증: dailyKcal 800~5000 벗어나면 "800~5000 사이로 입력해주세요" 인라인 에러, 비율 3개 합 ≠ 100이면 "탄단지 비율의 합은 100%가 되어야 해요 (현재 {n}%)" 인라인 에러. 저장 중 버튼 `loading` + 중복 제출 무시. 저장 성공 시 `setFlag('onboarded', true)` 후 `navigate('/', { replace: true })`. 동일 입력 폼을 `src/pages/GoalEditPage.tsx`(`/settings/goal`)에서 재사용 — 저장 시 "목표를 변경했어요" 토스트 후 `navigate(-1)`.
- DoD:
  - "감량" Chip 탭 시 dailyKcal TextField 값이 `1600`으로 변경 (유지=2000, 증량=2400 동일 동작)
  - dailyKcal `500` 입력 후 "시작하기" 탭 시 저장되지 않고 "800~5000 사이로 입력해주세요" 표시
  - 비율 `{40,40,30}` 입력 후 제출 시 "탄단지 비율의 합은 100%가 되어야 해요 (현재 110%)" 표시
  - 정상 입력 제출 시 `fct:goal` 저장 + `fct:flags.onboarded === true` + `/`로 replace 이동
  - 저장 처리 중 버튼이 `loading` 상태이고 추가 탭이 `setGoal`을 재호출하지 않음
  - 모든 Chip·Button의 렌더 높이 ≥ 44px
  - `/settings/goal`에서 1600→1800 저장 시 `fct:goal.dailyKcal === 1800` + "목표를 변경했어요" 토스트
  - TDS 컴포넌트에 Tailwind/인라인 padding·margin 오버라이드 0개, 간격은 `Spacing`만 사용
- Covers: [F2-AC1, F2-AC2, F2-AC3, F2-AC4, F2-AC5, F2-AC7, F2-AC8, S1, S8(목표 수정)]
- Files: `src/pages/OnboardingPage.tsx`, `src/pages/GoalEditPage.tsx`
- Depends on: Task 2.3

### Task 4.2 홈 대시보드
- Description: `src/pages/HomePage.tsx`를 구현한다. `ScreenScaffold` > `Top` > (목표 미설정 시 "목표를 설정하면 더 정확해요" ListRow → `/settings/goal`) > (프리미엄 만료 3일 이하 시 "프리미엄이 {n}일 후 만료돼요" ListRow → `/premium`) > `CalorieRing` Card > `MacroBars` Card > `<AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID} />`(무료 사용자만) > 끼니 그룹 `Card` ×4 > `SubmitFooter`("사진으로 기록하기" → `navigate('/capture', { state: { mealType } })`). 4개 끼니 Card는 기록 유무와 무관하게 항상 렌더링(`data-testid="meal-group-{mealType}"`), 헤더에 끼니 합계 kcal, 0건이면 "아직 기록이 없어요" + "+ 추가"(→ `/search`, state에 mealType). 기록 ListRow는 `aiGenerated`면 `<AiBadge compact />` 표시, 롱프레스 시 `BottomSheet`(수정/삭제) → 삭제는 `AlertDialog`("이 기록을 삭제할까요?") 확인 후 제거 + "기록을 삭제했어요" 토스트. 오늘 기록 0건이면 목록 영역에 `Asset.ContentIcon` + "오늘 첫 끼니를 기록해보세요". 오늘 기록 100건 초과 시 가상 스크롤(윈도잉)로 렌더.
- DoD:
  - `dailyKcal=1600`, 오늘 기록 `[210, 520]` 상태에서 `calorie-ring`에 소비 730·잔여 870·46% 표시
  - `meal-group-breakfast/lunch/dinner/snack` 4개 요소가 기록 0건이어도 항상 존재
  - 기록 0건 Card에 "아직 기록이 없어요"와 "+ 추가" 버튼 존재
  - 삭제 플로우 완주 시 `fct:meals`에서 항목 제거 + 링 소비 kcal 즉시 감소
  - `fct:goal` 미존재 상태 진입 시 크래시 없이 2000 기준 렌더 + "목표를 설정하면 더 정확해요" ListRow 표시
  - `isPremium()===false`면 `AdSlot` 1개 렌더, `true`면 0개
  - `premium.active && daysLeft <= 3`일 때 만료 임박 ListRow 표시, 탭 시 `/premium` 이동
  - 오늘 기록 120건 주입 시 초기 DOM 노드 수 40개 이하
  - `navigate('/capture', ...)` 인자가 `RouteState['/capture']` 타입에 할당 가능함이 `tsc`로 검증됨
  - 기록 ListRow 최소 높이 56px
- Covers: [F3-AC1, F3-AC2, F3-AC3, F3-AC5, F3-AC6, F3-AC7, F3-AC8, F3-AC9, F7-AC7, AC-G10(축약 배지), S2]
- Depends on: Task 3.1, Task 2.3

### Task 4.3 사진 촬영 화면 (선택·프리뷰·분석 요청)
- Description: `src/pages/CapturePage.tsx`를 구현한다. `location.state`를 `RouteState['/capture']`로 캐스팅해 mealType을 받고, undefined면 `inferMealType(Date.now())`로 추론. `ScreenScaffold` > `Top`(뒤로가기) > 끼니 `Chip` 4개(48px) > 프리뷰 `Card`(1:1, 미선택 시 `Asset.ContentIcon` + "음식 사진을 올려주세요") > "카메라로 촬영"/"앨범에서 선택" Button 2개(56px, `<input type="file" accept="image/*" capture>`) > `SubmitFooter`("분석하기", 이미지 미선택 시 비활성). 진입 시 `fct:flags.aiNoticeAcknowledged === false`면 생성형 AI 고지 `AlertDialog` 1회 노출 후 "확인" 탭 시 플래그 저장. "분석하기" 탭 → `resizeImage` → `analyzeImage` 호출. 대기 중 전체 화면 오버레이("AI가 음식을 분석하고 있어요" + 로딩 인디케이터, 뒤로가기 외 입력 차단). 성공 시 `incrementAiCount()` 후 `navigate('/result', { state: { candidates, mealType, source: 'ai_photo' } })`. 실패 시 에러별 토스트 + "다시 시도"(네트워크/서버) 또는 "직접 검색"(`navigate('/search', { state: { mealType } })`) 버튼. 응답 수신 즉시 이미지 base64·File 참조를 null로 해제.
- DoD:
  - `aiNoticeAcknowledged === false` 상태 첫 진입 시 "이 서비스는 생성형 AI를 활용합니다. 분석 결과는 추정치이며 실제 영양성분과 다를 수 있어요" AlertDialog 1회 노출, "확인" 후 플래그 `true` 저장, 재진입 시 미노출
  - 분석 성공 시 `fct:quota.aiCount`가 0→1 증가하고 `/result`로 이동하며 state가 `RouteState['/result']` 형태와 일치
  - `analyzeImage`가 NETWORK/INTERNAL_ERROR 반환 시 `aiCount` 증가 0, "다시 시도" 버튼 노출
  - `NO_FOOD_DETECTED` 반환 시 `aiCount` 증가 0, "음식을 찾지 못했어요. 다시 찍거나 직접 검색해보세요" + "직접 검색" 버튼 노출
  - `resizeImage`가 `TOO_LARGE` 반환 시 "사진 용량이 너무 커요. 다시 촬영해주세요" 토스트, fetch 호출 0회
  - 분석 완료(성공·실패 무관) 후 이미지 데이터 참조가 해제되어 localStorage에 이미지 키 0개
  - 대기 중 오버레이가 렌더되고 하단 버튼 재탭이 중복 요청을 발생시키지 않음
  - 촬영/앨범 버튼 높이 56px, 끼니 Chip 48px
- Covers: [F4-AC1, F4-AC2, F4-AC6, F4-AC7, F4-AC8, F4-AC9, F4-AC10, S3]
- Files: `src/pages/CapturePage.tsx`
- Depends on: Task 2.4, Task 2.3

### Task 4.4 무료 한도 게이트 + 보상형 광고 BottomSheet
- Description: `src/components/QuotaGateSheet.tsx`를 구현하고 `CapturePage`에 연결한다. `isPremium() === false && quota.aiCount >= 3 + quota.bonusCount`일 때 "분석하기" 버튼을 비활성 상태로 두고, 탭 시 `BottomSheet`를 열어 "오늘 무료 3회를 모두 사용했어요" 문구와 두 선택지를 표시한다 — "광고 보고 1회 더"(`bonusCount < 2`일 때만 렌더, `<TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}>`로 감싸 시청 완료 콜백에서 `addBonusCount()` 실행 + "1회 더 분석할 수 있어요" 토스트), "프리미엄 시작하기"(`navigate('/premium')`). 광고 중도 이탈 콜백에서는 `bonusCount`를 증가시키지 않고 "광고를 끝까지 봐야 추가 분석을 받을 수 있어요" 토스트. `isPremium() === true`면 게이트 자체를 적용하지 않음.
- DoD:
  - `{ aiCount: 3, bonusCount: 0 }` + 무료 상태에서 "분석하기" 버튼 `disabled`이고 탭 시 BottomSheet 노출
  - BottomSheet에 "오늘 무료 3회를 모두 사용했어요" 문구 존재
  - `bonusCount === 2`일 때 "광고 보고 1회 더" 선택지가 렌더되지 않고 "프리미엄 시작하기"만 노출
  - 광고 시청 완료 콜백 후 `fct:quota.bonusCount === 1`, "1회 더 분석할 수 있어요" 토스트, "분석하기" 버튼 활성화
  - 광고 중도 이탈 콜백 후 `bonusCount` 변화 0, "광고를 끝까지 봐야 추가 분석을 받을 수 있어요" 토스트
  - `isPremium() === true`이면 `aiCount === 10`이어도 "분석하기" 버튼 활성 상태
  - "프리미엄 시작하기" 탭 시 `navigate('/premium')` 호출
- Covers: [F4-AC3, F4-AC4, F4-AC5, F7-AC3(a)]
- Files: `src/components/QuotaGateSheet.tsx`, `src/pages/CapturePage.tsx`(연결부)
- Depends on: Task 4.3

### Task 4.5 결과 확인·보정 화면
- Description: `src/pages/ResultPage.tsx`를 구현한다. `location.state`를 `RouteState['/result']`로 캐스팅. state가 undefined면 "표시할 결과가 없어요" + "홈으로" 버튼(→ `navigate('/', { replace: true })`)만 렌더. 정상 시 `ScreenScaffold` > `Top`("기록 확인") > 후보 `Chip` 목록(`candidates.length >= 2`일 때, 각 `foodName` + confidence 백분율; 선택 시 Card 내용 교체) > `data-testid="nutrition-card"` Card(kcal CountUp t2 히어로 + `MacroBars`, `source === 'ai_photo'`면 상단에 `<AiBadge />`) > `data-testid="edit-card"` Card(음식명 TextField / 중량 TextField `inputMode="numeric"` / 끼니 Chip) > `SubmitFooter`("기록하기", 56px). 중량 변경 시 원본 후보 기준 비례 재계산(kcal 반올림 정수, 탄단지 소수 1자리) 및 `edited: true` 마킹. "기록하기" → `addMeal(...)`; `STORAGE_FULL` 시 이동하지 않고 "저장 공간이 부족해요. 오래된 기록을 정리해주세요" 토스트 + "설정에서 정리하기" 버튼; 중량 0 등 범위 위반 시 "중량은 1g 이상 3000g 이하로 입력해주세요" 인라인 에러; 성공 시 "{끼니}에 기록했어요" 토스트 후 `navigate('/', { replace: true })`. 중량 포커스 시 `SubmitFooter`가 키보드 높이만큼 상승.
- DoD:
  - state undefined 진입 시 "표시할 결과가 없어요" + "홈으로" 버튼만 렌더, 버튼 탭 시 `/` replace 이동
  - 후보 `{amountGram:450, kcal:620, carbG:92.0, proteinG:18.0, fatG:16.5}`에서 중량을 `300`으로 변경 시 kcal `413`, carbG `61.3`, proteinG `12.0`, fatG `11.0`으로 즉시 갱신
  - 미수정 저장 시 `edited: false`, 중량 수정 후 저장 시 `edited: true`
  - `source === 'ai_photo'` 시 `data-testid="ai-badge"`에 "AI가 생성한 결과입니다" 표시, `aiGenerated: true`로 저장
  - `data-testid="nutrition-card"`와 `data-testid="edit-card"`가 각 1개씩 렌더
  - `candidates.length === 3`일 때 후보 Chip 3개 렌더, 다른 Chip 선택 시 nutrition-card 수치 교체
  - 중량 `0` 입력 후 제출 시 저장되지 않고 "중량은 1g 이상 3000g 이하로 입력해주세요" 표시
  - `addMeal`이 `STORAGE_FULL` 반환 시 화면 유지 + 지정 토스트 + "설정에서 정리하기" 버튼 노출
  - 성공 저장 시 "점심에 기록했어요" 형태 토스트 후 `/` replace 이동
  - 중량 TextField에 `inputMode="numeric"` 속성 존재
- Covers: [F5-AC1, F5-AC2, F5-AC3, F5-AC4, F5-AC5, F5-AC6, F5-AC7, F5-AC8, F5-AC9, S4]
- Files: `src/pages/ResultPage.tsx`
- Depends on: Task 3.1, Task 2.3

### Task 4.6 음식 검색 화면
- Description: `src/pages/SearchPage.tsx`를 구현한다. `location.state`를 `RouteState['/search']`로 캐스팅해 mealType 수신(undefined면 `inferMealType`). `ScreenScaffold` > `Top`("음식 검색") > 검색 `TextField`(`type="search"`, sticky, 진입 시 자동 포커스) > 끼니 `Chip` 그룹 > 결과 `Card` 섹션. 400ms 디바운스 후 `searchFoods(q, signal)` 호출, 이전 in-flight 요청은 `AbortController.abort()`로 취소. 로딩 중 스켈레톤 ListRow 5개 표시(이전 결과 제거). 결과 ListRow는 제목=`foodName`, 부제=`brand` + "{servingGram}g당 {kcal}kcal", `brand !== ''`이면 브랜드 `Chip` 표시, 최소 높이 56px. ListRow 탭 시 `kcalPer100g × servingGram / 100` 등으로 servingGram 기준 영양소를 계산해 `navigate('/result', { state: { candidates: [{...confidence: 1}], mealType, source: 'db_search' } })`, 동시에 `pushRecentFood(item)`. 검색어 없으면 "최근 기록한 음식" 섹션(`fct:recentFoods`), 캐시도 비면 `Asset.ContentIcon` + "음식 이름을 검색해보세요". 결과 0건이면 "'{q}' 검색 결과가 없어요" + "직접 입력하기"(→ `/result`, `source: 'manual'`, kcal 0). API 오류 시 "검색에 실패했어요. 잠시 후 다시 시도해주세요" + "다시 시도", recentFoods 섹션은 유지. 스크롤 시작 시 키보드 dismiss.
- DoD:
  - `된장찌개` 입력 후 400ms 경과 시 `GET .../api/foods/search?q=%EB%90%9C%EC%9E%A5%EC%B0%8C%EA%B0%9C&limit=20` 1회 호출
  - 1초 내 5글자 연속 입력 시 실제 fetch 호출 1회, 이전 요청은 abort됨
  - `{ foodId:'mfds_1042', foodName:'된장찌개', servingGram:400, kcalPer100g:53 }` 탭 시 `/result`로 이동하며 candidate가 `{ foodName:'된장찌개', amountGram:400, kcal:212, confidence:1 }`
  - 동일 항목 선택 후 `fct:recentFoods[0].foodId === 'mfds_1042'`, 중복 선택 시 배열 길이 증가 없음, 31번째 신규 항목 추가 시 길이 30 유지
  - 로딩 중 스켈레톤 ListRow 5개 렌더 + 이전 결과 DOM 제거
  - `foods: []` 응답 시 "'zzzz' 검색 결과가 없어요" + "직접 입력하기" 노출, 탭 시 `source: 'manual'` + kcal 0 candidate로 `/result` 이동
  - 500 응답 시 "검색에 실패했어요. 잠시 후 다시 시도해주세요" + "다시 시도" 노출, recentFoods 섹션 유지
  - 검색어 공백 + recentFoods 0건일 때 "음식 이름을 검색해보세요" 빈 상태 렌더
  - `brand === 'CU'`인 항목에 브랜드 Chip 렌더
  - 결과 ListRow 렌더 높이 ≥ 44px
- Covers: [F6-AC1, F6-AC2, F6-AC3, F6-AC4, F6-AC5, F6-AC6, F6-AC7, F6-AC8, F6-AC9, S5]
- Files: `src/pages/SearchPage.tsx`
- Depends on: Task 2.4, Task 2.3

### Task 4.7 프리미엄 결제 화면
- Description: `src/pages/PremiumPage.tsx`를 구현한다. `ScreenScaffold` > `Top`("프리미엄") > `data-testid="premium-benefits"` Card(ListRow 3개: "AI 사진 인식 무제한", "주간 영양 리포트", "광고 없이 이용") > `Paragraph.Text`("30일 이용권 · ₩6,900 · 자동 갱신되지 않습니다") > `SubmitFooter`(`<TossPurchase sku={import.meta.env.VITE_TOSS_IAP_SKU} processProductGrant={...} onPurchased={...} />`, 버튼 높이 56px). `processProductGrant`에서 `grantPremium(orderId)` 호출로 `fct:premium` 갱신, `onPurchased`에서 "프리미엄이 시작됐어요" 토스트 후 `navigate('/', { replace: true })`. 결제 진행 중 버튼 `loading` + "결제를 진행하고 있어요" 문구 + 뒤로가기 외 조작 차단. 취소 시 `fct:premium` 무변경 + "결제를 취소했어요" 토스트만 표시하고 화면 유지. 실패 시 `fct:premium` 무변경 + "결제에 실패했어요. 잠시 후 다시 시도해주세요" + "다시 시도" 버튼, `console.error` 미호출. 외부 링크·앱 설치 유도 문구 0개.
- DoD:
  - `onPurchased({ orderId: 'ord_9001' })` 수신 시 `fct:premium === { active: true, expiresAt: 현재+30일ms, lastOrderId: 'ord_9001' }` + "프리미엄이 시작됐어요" 토스트 + `/` replace 이동
  - 만료 5일 남은 상태에서 재결제 시 `expiresAt`이 기존 만료 시각 기준 +30일(현재 시각 기준 아님)
  - 결제 취소 콜백 시 `fct:premium` 값 변화 0, "결제를 취소했어요" 토스트, `/premium` 유지
  - 결제 실패 콜백 시 `fct:premium` 값 변화 0, "결제에 실패했어요. 잠시 후 다시 시도해주세요" + "다시 시도" 노출, `console.error` 호출 0
  - "30일 이용권 · ₩6,900 · 자동 갱신되지 않습니다" 문구 렌더
  - `data-testid="premium-benefits"` 내부 ListRow 정확히 3개
  - 처리 중 결제 버튼 `loading` 상태 + "결제를 진행하고 있어요" 문구 렌더
  - 파일 내 `window.open` / `window.location.href` / "설치" / "다운로드" 문자열 0개
- Covers: [F7-AC1, F7-AC2, F7-AC4, F7-AC5, F7-AC6, F7-AC8, F7-AC9, AC-G1, AC-G5, AC-G6, S6]
- Files: `src/pages/PremiumPage.tsx`
- Depends on: Task 2.3

### Task 4.8 주간 리포트 화면
- Description: `src/pages/ReportPage.tsx`를 구현한다. `buildWeeklyReport(meals, goal)` 결과로 `ScreenScaffold` > `Top`("주간 리포트") > `data-testid="report-summary-card"`(일평균 kcal CountUp 히어로 + 목표 달성일 수) > `<AdSlot />`(무료만) > `data-testid="trend-card"`(`Sparkline` 7일 kcal + 목표선) > `data-testid="macro-card"`(`MacroBars` 평균) > `data-testid="top-foods-card"`(TOP 3 ListRow, 56px)를 이 순서로 렌더. 무료 사용자는 trend/macro/top-foods 3개 Card에 블러 오버레이 + 잠금 아이콘을 적용하고 `SubmitFooter`("프리미엄으로 전체 리포트 보기" → `/premium`)를 고정 노출하되 summary-card는 잠금 없이 공개. 7일 기록 0건이면 차트 대신 `Asset.ContentIcon` + "3일 이상 기록하면 리포트를 볼 수 있어요" + "기록하러 가기"(→ `/capture`, state에 `inferMealType` 결과). 집계 완료 전에는 각 Card 자리에 TDS 스켈레톤 표시.
- DoD:
  - 프리미엄 상태에서 4개 Card가 `report-summary-card` → `trend-card` → `macro-card` → `top-foods-card` 순서로 DOM에 존재
  - 일별 `[1500,1800,0,1650,2100,1400,1600]` + `dailyKcal=1600`일 때 일평균 `1436kcal`, 달성일 `3일` 표시
  - TOP 3에 `비빔밥(4회)`, `아메리카노(3회)`, `된장찌개(3회)` 순서로 표시
  - 무료 상태에서 trend/macro/top-foods Card에 블러 오버레이 존재, summary-card에는 없음, `SubmitFooter` CTA 노출
  - 무료 상태에서 `AdSlot`이 summary-card와 trend-card **사이**에 1개 렌더, 프리미엄 상태에서 0개
  - 7일 기록 0건 시 차트 미렌더 + "3일 이상 기록하면 리포트를 볼 수 있어요" + "기록하러 가기" 노출
  - `kcal: NaN` 항목 포함 시 화면에 "NaN" 문자열 0개
  - `dailyKcal: 0` 손상 시 `Infinity`/`NaN` 미노출
  - 집계 미완료 시 스켈레톤 렌더
- Covers: [F8-AC1, F8-AC2, F8-AC3, F8-AC4, F8-AC5, F8-AC6, F8-AC7, F8-AC8, F8-AC9, F7-AC3(c), S7]
- Files: `src/pages/ReportPage.tsx`
- Depends on: Task 3.2, Task 3.1, Task 2.3

### Task 4.9 설정 + 약관 화면
- Description: `src/pages/SettingsPage.tsx`(`/settings`)와 `src/pages/TermsPage.tsx`(`/settings/terms`)를 구현한다. 설정: `ScreenScaffold` > `Top`("설정") > Card(ListRow "목표 수정" → `/settings/goal`, "데이터 정리" → `AlertDialog` 확인 후 오래된 기록 500건 삭제 + "오래된 기록을 정리했어요" 토스트, "프리미엄 상태" — 활성 시 "{n}일 남음" / 비활성 시 "이용권 없음" → `/premium`) > Card(ListRow "이용약관" → `/settings/terms`, `Switch` "다크모드 — OS 설정을 따릅니다" disabled 표기) > Card(`Paragraph.Text` "데이터는 이 기기에만 저장되며 기기 간 동기화·백업은 제공하지 않습니다"). 약관 화면은 앱 내부 라우트로 이용약관·개인정보처리방침 텍스트를 `Paragraph.Text`로 렌더(외부 링크 0개). ListRow 최소 56px, Switch 터치 영역 44×44px.
- DoD:
  - "목표 수정" 탭 시 `/settings/goal` 이동
  - "데이터 정리" 확인 시 `fct:meals` 항목 수가 감소하고 "오래된 기록을 정리했어요" 토스트 표시
  - 프리미엄 활성 시 ListRow 부제에 "{n}일 남음", 비활성 시 "이용권 없음" 표시
  - "이용약관" 탭 시 `/settings/terms` 내부 라우트로 이동 (`window.open` 미사용)
  - 단일 기기 저장 고지 문구 렌더
  - 두 파일에 `window.open` / `window.location.href` / 외부 URL 문자열 0개
  - ListRow 렌더 높이 ≥ 56px, Switch 터치 영역 ≥ 44×44px
- Covers: [F1-AC5(정리 UI), F5-AC8(정리 진입점), AC-G6, Assumption 7, Assumption 8, S8]
- Files: `src/pages/SettingsPage.tsx`, `src/pages/TermsPage.tsx`
- Depends on: Task 2.3

---

## Epic 5. 통합 + 검수 폴리시

**Risk Assessment**
- Complexity: Medium
- Risk factors: (a) 온보딩 가드가 라우터 최상단에 없으면 신규 사용자가 `/`에 진입해 빈 화면을 봄. (b) 부트스트랩 완료 전 페이지가 렌더되면 손상 데이터로 크래시. (c) HEX 하드코딩·`console.error`·외부 SDK가 남아 있으면 검수 즉시 반려 — 개별 페이지 패킷만으로는 전역 보장 불가.
- Mitigation: 모든 페이지 패킷 완료 후 라우터를 마지막에 배선해 가드·스켈레톤을 단일 지점에서 강제. 검수 정적 검사(5.2)를 별도 최종 패킷으로 두어 전역 위반을 grep으로 0건 확인한다.

### Task 5.1 라우터 배선 + 온보딩 가드 + 부트스트랩 게이트
- Description: `src/App.tsx`에 `react-router-dom` `BrowserRouter` 라우트를 배선한다: `/`, `/onboarding`, `/capture`, `/result`, `/search`, `/premium`, `/report`, `/settings`, `/settings/goal`, `/settings/terms`. `useAppReady()`가 `false`인 동안 모든 라우트 대신 TDS 스켈레톤 화면만 렌더. `src/components/OnboardingGuard.tsx`를 만들어 `fct:flags.onboarded === false`이면 `/onboarding` 외 모든 경로에서 `<Navigate to="/onboarding" replace />`. 홈·검색·리포트·설정 4개 라우트에 템플릿 제공 `FloatingTabBar`(홈/검색/리포트/설정)를 노출하고, `/capture`·`/result`·`/premium`·`/onboarding`에서는 숨긴다. 알 수 없는 경로는 `/`로 replace.
- DoD:
  - 10개 라우트 전부가 해당 페이지 컴포넌트를 렌더하고 `tsc --noEmit` 통과
  - `useAppReady() === false`일 때 페이지 컴포넌트가 렌더되지 않고 스켈레톤만 표시
  - `onboarded === false` 상태에서 `/`, `/report`, `/settings` 직접 진입 시 모두 `/onboarding`으로 replace 이동
  - `onboarded === true`이면 `/onboarding` 진입 시에도 정상 렌더(무한 리디렉션 없음)
  - `FloatingTabBar`가 `/`, `/search`, `/report`, `/settings`에서만 렌더
  - `/unknown-path` 진입 시 `/`로 replace 이동
- Covers: [F1-AC7, F2-AC6, F1-AC8(부팅 시 적용), S2/S5/S7/S8 탭바]
- Files: `src/App.tsx`, `src/components/OnboardingGuard.tsx`
- Depends on: Task 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9

### Task 5.2 검수 정적 검사 + 최종 폴리시
- Description: 토스 검수 전역 ACs를 코드베이스 전체에 대해 검증하고 위반을 수정한다. (1) `grep -rn "window.open\|window.location.href" src/` 0건 — 위반 시 내부 라우팅으로 대체. (2) `grep -rEn "#[0-9a-fA-F]{3,8}\b" src/ --include=*.tsx --include=*.ts --include=*.css` 0건 — 위반 시 `var(--tds-color-*)`로 치환. (3) `grep -rn "console.error\|console.warn" src/` 0건. (4) `grep -rn "\.at(\|Object.groupBy\|structuredClone\|findLast" src/` 0건 — 위반 시 인덱스 접근·수동 구현으로 대체. (5) `package.json` 의존성에 GA/Amplitude/Mixpanel/Sentry, shadcn/MUI/Ant/Chakra 0개 확인. (6) "설치"/"다운로드"/"스토어" 문구 0건. (7) 터치 타겟: 모든 Button/Chip/ListRow/Switch 렌더 높이 ≥ 44px 확인. (8) `grantPromotionReward` 호출 전 `amount <= 5000` 검증 헬퍼를 `src/lib/promotion.ts`에 추가(MVP 미사용, 초과 시 호출 없이 `{ ok: false, error: 'REWARD_LIMIT_EXCEEDED' }` 반환). (9) `vite build` 성공 및 전체 플로우(온보딩→홈→촬영→결과→검색→리포트→프리미엄) 1회 순회 시 `console.error` 0회.
- DoD:
  - 위 grep 1~4번, 6번이 각각 매치 0건
  - `package.json`에 금지 SDK/UI 라이브러리 0개
  - `vite build` 종료 코드 0
  - 전체 플로우 순회 중 `console.error` 호출 0회
  - `src/lib/promotion.ts`의 `grantReward({ promotionCode, amount: 6000 })`가 SDK 호출 없이 `{ ok: false, error: 'REWARD_LIMIT_EXCEEDED' }` 반환
  - 다크모드(OS 다크 설정)에서 전체 화면 텍스트/배경 대비 유지 확인
  - 외부 API 응답에 `Access-Control-Allow-Origin` 헤더 존재 확인 (CORS 에러 0건)
- Covers: [AC-G1, AC-G2, AC-G3, AC-G4, AC-G5, AC-G6, AC-G7, AC-G8, AC-G9, AC-G10, F2-AC8, F6-AC8, P7]
- Files: `src/lib/promotion.ts`, (검사 결과에 따른 전역 수정)
- Depends on: Task 5.1

---

## AC Coverage

**Total ACs in SPEC: 78**
(F1: 8, F2: 8, F3: 9, F4: 10, F5: 9 + S4 보상형 게이트 AC 1, F6: 9, F7: 9, F8: 9, 전역 G1–G10: 10 → 8+8+9+10+10+9+9+9+10 = 82. 단, S4 게이트 AC는 F5 범위 내 추가 1건으로 총 **82**)

**Covered by tasks: 82**

| Feature | AC | Task |
|---|---|---|
| F1 | AC-1 | 1.1, 2.2 |
| F1 | AC-2 | 2.2 |
| F1 | AC-3 | 2.2 |
| F1 | AC-4 | 1.1, 2.1 |
| F1 | AC-5 | 2.1, 2.2, 4.9 |
| F1 | AC-6 | 2.2 |
| F1 | AC-7 | 2.3, 5.1 |
| F1 | AC-8 | 2.3, 5.1 |
| F2 | AC-1 | 4.1 |
| F2 | AC-2 | 4.1 |
| F2 | AC-3 | 4.1 |
| F2 | AC-4 | 4.1 |
| F2 | AC-5 | 4.1 |
| F2 | AC-6 | 5.1 |
| F2 | AC-7 | 2.3, 4.1 |
| F2 | AC-8 | 4.1, 5.2 |
| F3 | AC-1 | 3.1, 4.2 |
| F3 | AC-2 | 3.1, 4.2 |
| F3 | AC-3 | 4.2 |
| F3 | AC-4 | 3.1 |
| F3 | AC-5 | 2.3, 4.2 |
| F3 | AC-6 | 4.2 |
| F3 | AC-7 | 4.2 |
| F3 | AC-8 | 4.2 |
| F3 | AC-9 | 4.2 |
| F4 | AC-1 | 4.3 |
| F4 | AC-2 | 4.3 |
| F4 | AC-3 | 4.4 |
| F4 | AC-4 | 4.4 |
| F4 | AC-5 | 4.4 |
| F4 | AC-6 | 4.3 |
| F4 | AC-7 | 2.4, 4.3 |
| F4 | AC-8 | 2.4, 4.3 |
| F4 | AC-9 | 2.4, 4.3 |
| F4 | AC-10 | 2.4, 4.3 |
| F5 | AC-1 | 4.5 |
| F5 | AC-2 | 4.5 |
| F5 | AC-3 | 3.1, 4.5 |
| F5 | AC-4 | 4.5 |
| F5 | AC-5 | 4.5 |
| F5 | AC-6 | 1.1, 4.5 |
| F5 | AC-7 | 4.5 |
| F5 | AC-8 | 4.5, 4.9 |
| F5 | AC-9 | 4.5 |
| S4 | 보상형 게이트 AC | 4.4, 4.5 |
| F6 | AC-1 | 2.4, 4.6 |
| F6 | AC-2 | 2.2, 4.6 |
| F6 | AC-3 | 4.6 |
| F6 | AC-4 | 4.6 |
| F6 | AC-5 | 4.6 |
| F6 | AC-6 | 2.4, 4.6 |
| F6 | AC-7 | 2.4, 4.6 |
| F6 | AC-8 | 2.4, 4.6, 5.2 |
| F6 | AC-9 | 4.6 |
| F7 | AC-1 | 2.2, 4.7 |
| F7 | AC-2 | 2.2, 4.7 |
| F7 | AC-3 | 4.4(a), 4.2(b), 4.8(c) |
| F7 | AC-4 | 4.7 |
| F7 | AC-5 | 4.7 |
| F7 | AC-6 | 4.7 |
| F7 | AC-7 | 2.2, 4.2 |
| F7 | AC-8 | 4.7 |
| F7 | AC-9 | 4.7 |
| F8 | AC-1 | 3.2, 4.8 |
| F8 | AC-2 | 4.8 |
| F8 | AC-3 | 3.2, 4.8 |
| F8 | AC-4 | 4.8 |
| F8 | AC-5 | 4.8 |
| F8 | AC-6 | 4.8 |
| F8 | AC-7 | 3.2, 4.8 |
| F8 | AC-8 | 3.1, 3.2, 4.8 |
| F8 | AC-9 | 4.8 |
| G | AC-G1 | 2.4, 4.7, 5.2 |
| G | AC-G2 | 2.1, 2.4, 5.2 |
| G | AC-G3 | 2.4, 5.2 |
| G | AC-G4 | 2.1, 3.2, 5.2 |
| G | AC-G5 | 4.7, 5.2 |
| G | AC-G6 | 4.7, 4.9, 5.2 |
| G | AC-G7 | 5.2 |
| G | AC-G8 | 3.1, 5.2 |
| G | AC-G9 | 5.2 |
| G | AC-G10 | 3.1, 4.2, 4.5, 5.2 |

**Uncovered: 0**