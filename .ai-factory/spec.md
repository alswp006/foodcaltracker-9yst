# SPEC — FoodCalTracker

> 앱인토스 미니앱 / Vite + React + TypeScript + TDS(@toss/tds-mobile) + React Router + localStorage
> 대상 PRD: FoodCalTracker (한국 음식 특화 AI 영양 트래커)

---

## Common Principles

### P1. 기술 스택 고정
- UI는 **TDS 컴포넌트만** 사용 (ListRow, Button, TextField, Paragraph.Text, Chip, Switch, AlertDialog, BottomSheet, Toast, Top, Tab, Spacing, Card). shadcn/MUI/Ant/Chakra 사용 금지.
- 하단 탭 네비게이션은 템플릿 제공 `src/components/FloatingTabBar` 사용 (TDS에 TabBar 없음).
- 페이지 골격은 `ScreenScaffold`(템플릿 제공)로 감싼다. raw `<div>` 골격 금지.
- 간격은 TDS `Spacing`(size prop 필수)만 사용. TDS 컴포넌트에 Tailwind/인라인 padding·margin 덮어쓰기 금지.
- 커스텀 CSS는 TDS 미제공 레이아웃(flex/grid 배치, 칼로리 링 SVG)에만 허용.
- 색상은 `var(--tds-color-*)` CSS 변수만 사용. HEX 하드코딩 금지 (다크모드 필수).

### P2. 인증 / 세션
- 토스 앱이 세션을 자동 제공. 로그인 함수 호출·커스텀 인증 구현 금지.
- 사용자 식별이 필요한 지점(프리미엄 검증)에서만 `getIsTossLoginIntegratedService()`로 연동 상태 확인.

### P3. 데이터 저장
- 모든 사용자 데이터는 **localStorage**에 저장. 서버는 **읽기 전용 조회 API**(AI 인식, 음식 DB 검색)만 담당하며 사용자 데이터를 저장하지 않는다.
- 전체 localStorage 사용량은 **5MB 미만** 유지. 초과 임박 시 오래된 기록부터 정리.
- 모든 저장 키는 `fct:` 프리픽스를 갖는다.

### P4. 수익화
- 무료: **사진 AI 인식 1일 3회**. 초과 시 프리미엄 유도 BottomSheet.
- 프리미엄: **30일 이용권 ₩6,900 (IAP 1회성 결제)** — `TossPurchase` 컴포넌트 사용. 자동갱신 구독은 SDK 미지원이므로 **기간제 이용권**으로 구현하고 만료 3일 전 홈에서 재구매 배너 노출.
- 배너 광고: `<AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID} />` — 콘텐츠 섹션 **사이**에만 배치, 겹침 금지. 프리미엄 사용자에게는 미노출.
- 보상형 광고: `<TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}>` — 무료 사용자가 **일일 3회 소진 후 1회 추가 인식**을 얻는 게이트로 사용.

### P5. 생성형 AI 고지 (법정 의무)
- 사진 AI 인식 기능 최초 사용 시 "이 서비스는 생성형 AI를 활용합니다" 다이얼로그 1회 노출.
- AI가 추정한 모든 칼로리/영양소 결과에 **"AI가 생성한 결과입니다"** 배지 상시 표시.

### P6. 토스 검수 준수
- `window.location.href` / `window.open` 을 통한 외부 도메인 이탈 금지.
- 외부 분석 솔루션(GA, Amplitude 등) 미탑재.
- "앱 설치", "다운로드" 등 외부 앱 설치 유도 문구/배너 금지.
- 프로덕션 빌드에서 `console.error` 출력 0개.
- 외부 API는 CORS 허용 헤더(`Access-Control-Allow-Origin`) 설정 완료 상태.
- Android 7+ / iOS 16+ 호환. `Array.prototype.at`, `Object.groupBy`, `structuredClone` 등 최신 전용 API 사용 금지.

### P7. 모바일 UX
- 모든 터치 타겟 **최소 44×44px**.
- 숫자 입력 TextField는 `inputMode="numeric"`, 포커스 시 하단 고정 버튼이 키보드에 가려지지 않도록 `SubmitFooter`가 키보드 위로 밀려 올라간다.
- 리스트 항목 100개 초과 시 가상 스크롤(윈도잉) 적용.

---

## Data Models

### MealRecord — 식사 기록 1건
```ts
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type FoodSource = 'ai_photo' | 'db_search' | 'barcode' | 'manual';

export interface MealRecord {
  id: string;            // crypto.randomUUID()
  date: string;          // 'YYYY-MM-DD' (KST 기준)
  createdAt: number;     // epoch ms
  mealType: MealType;
  foodName: string;      // 1~40자
  source: FoodSource;
  amountGram: number;    // 1~3000, 정수
  kcal: number;          // 0~5000, 정수
  carbG: number;         // 0~500, 소수 1자리
  proteinG: number;      // 0~500, 소수 1자리
  fatG: number;          // 0~500, 소수 1자리
  aiGenerated: boolean;  // true면 "AI가 생성한 결과입니다" 배지 노출
  edited: boolean;       // AI 추정치를 사용자가 수정했는지
}
```
- 제약: `foodName` 공백만으로 구성 불가. `kcal === 0 && amountGram === 0` 저장 불가.

### UserGoal — 목표 설정
```ts
export type GoalType = 'lose' | 'maintain' | 'gain';

export interface UserGoal {
  dailyKcal: number;     // 800~5000, 정수
  goalType: GoalType;
  carbRatio: number;     // 0~100 정수, 3개 합 === 100
  proteinRatio: number;
  fatRatio: number;
  updatedAt: number;
}
```

### UsageQuota — 무료 사용량
```ts
export interface UsageQuota {
  date: string;          // 'YYYY-MM-DD'
  aiCount: number;       // 0~99, 당일 AI 인식 사용 횟수
  bonusCount: number;    // 보상형 광고로 획득한 추가 횟수 (당일 최대 2)
}
```

### PremiumState — 이용권
```ts
export interface PremiumState {
  active: boolean;
  expiresAt: number;     // epoch ms. active=false면 0
  lastOrderId: string;   // IAP 주문 식별자, 없으면 ''
}
```

### AppFlags — 고지/온보딩 플래그
```ts
export interface AppFlags {
  onboarded: boolean;
  aiNoticeAcknowledged: boolean;  // 생성형 AI 고지 확인 여부
  schemaVersion: 1;
}
```

### FoodCandidate — AI 인식 결과 후보 (서버 응답, 저장 안 함)
```ts
export interface FoodCandidate {
  foodName: string;
  confidence: number;    // 0~1, 소수 2자리
  amountGram: number;
  kcal: number;
  carbG: number;
  proteinG: number;
  fatG: number;
}
```

### FoodDbItem — 음식 DB 검색 결과 (서버 응답, 최근 항목만 캐시)
```ts
export interface FoodDbItem {
  foodId: string;
  foodName: string;
  brand: string;         // 없으면 ''
  servingGram: number;
  kcalPer100g: number;
  carbPer100g: number;
  proteinPer100g: number;
  fatPer100g: number;
}
```

### localStorage 키 / 크기 산정

| 키 | 값 타입 | 형태 | 크기 추정 |
|---|---|---|---|
| `fct:meals` | `MealRecord[]` | 전체 기록 배열, `createdAt` 내림차순 | 1건 ≈ 260B. 1일 5건 × 365일 = 1,825건 ≈ **475KB** |
| `fct:goal` | `UserGoal` | 단일 객체 | ≈ 120B |
| `fct:quota` | `UsageQuota` | 당일치만 유지 | ≈ 70B |
| `fct:premium` | `PremiumState` | 단일 객체 | ≈ 100B |
| `fct:flags` | `AppFlags` | 단일 객체 | ≈ 80B |
| `fct:recentFoods` | `FoodDbItem[]` | 최근 검색 **최대 30건** FIFO | 1건 ≈ 200B → **6KB** |

- 총 상한: **약 490KB** (< 5MB). 사진 원본은 저장하지 않는다(메모리에서만 처리 후 폐기).
- `fct:meals` 항목이 3,000건 초과 시 가장 오래된 500건을 삭제한다.

---

## Feature List

### F1. 데이터 저장 계층 & 앱 부트스트랩

- **Description:** localStorage 기반 CRUD 유틸(`storage.ts`)과 도메인 리포지토리(meals / goal / quota / premium / flags)를 구현한다. 앱 시작 시 스키마 검증·마이그레이션·일일 쿼터 리셋을 수행하고, 손상된 값은 안전 기본값으로 복구한다. UI 없이 순수 로직 + 훅(`useMeals`, `useGoal`, `useQuota`, `usePremium`)만 제공한다.
- **Data:** MealRecord, UserGoal, UsageQuota, PremiumState, AppFlags
- **API:** 없음 (로컬 전용)
- **Requirements:**

**AC-1 [U][P0]: Scenario: 기록 저장 및 조회 왕복**
- Given `fct:meals`가 비어 있을 때
- When `addMeal({ mealType: 'lunch', foodName: '된장찌개', amountGram: 400, kcal: 210, carbG: 18.0, proteinG: 12.5, fatG: 9.0, source: 'ai_photo', aiGenerated: true })` 호출
- Then `id`(UUID)와 `date`(KST 'YYYY-MM-DD'), `createdAt`이 자동 부여되어 `fct:meals`에 저장됨
- And `getMealsByDate(오늘)` 이 길이 1의 배열을 반환함

**AC-2 [E][P0]: Scenario: 일일 쿼터 자동 리셋**
- Given `fct:quota`가 `{ date: '2026-07-19', aiCount: 3, bonusCount: 1 }` 인 상태
- When 2026-07-20에 앱을 부팅하고 `getQuota()` 호출
- Then `{ date: '2026-07-20', aiCount: 0, bonusCount: 0 }` 이 반환되고 localStorage에도 반영됨

**AC-3 [S][P0]: Scenario: 프리미엄 만료 판정**
- Given `fct:premium`이 `{ active: true, expiresAt: 1752969600000, lastOrderId: 'ord_1' }` 이고 현재 시각이 `expiresAt` 이후일 때
- When `isPremium()` 호출
- Then `false`가 반환되고 `fct:premium.active`가 `false`로 갱신됨

**AC-4 [W][P1]: Scenario: 손상된 JSON 복구**
- Given `fct:goal` 값이 `'{broken'` 문자열일 때
- When `getGoal()` 호출
- Then 예외를 던지지 않고 기본값 `{ dailyKcal: 2000, goalType: 'maintain', carbRatio: 50, proteinRatio: 30, fatRatio: 20 }` 반환
- And `console.error`를 호출하지 않음

**AC-5 [W][P1]: Scenario: localStorage 용량 초과**
- Given `setItem` 호출이 `QuotaExceededError`를 던지는 상태
- When `addMeal(...)` 호출
- Then `fct:meals`의 오래된 500건을 삭제 후 1회 재시도함
- And 재시도도 실패하면 `{ ok: false, error: 'STORAGE_FULL' }` 반환하고 호출부가 "저장 공간이 부족해요. 오래된 기록을 정리해주세요" 토스트를 표시함

**AC-6 [W][P1]: Scenario: 잘못된 값 거부**
- Given 유효한 저장소 상태
- When `addMeal({ foodName: '   ', amountGram: 0, kcal: 0, ... })` 호출
- Then 저장되지 않고 `{ ok: false, error: 'INVALID_INPUT' }` 반환

**AC-7 [S][P1]: Scenario: 부팅 로딩 상태**
- While 저장소 초기화(`bootstrap()`)가 완료되지 않은 동안
- The system shall `useAppReady()`가 `false`를 반환하게 하고, 라우터는 TDS 스켈레톤 화면만 렌더링한다

**AC-8 [U][P2]: The system shall `fct:flags.schemaVersion`이 1이 아닌 경우 전체 키를 기본값으로 초기화한다**

---

### F2. 온보딩 & 목표 설정

- **Description:** 최초 진입 시 목표 유형(감량/유지/증량)과 일일 목표 칼로리, 탄단지 비율을 설정하는 화면을 제공한다. 설정값은 `fct:goal`에 저장되며 홈의 칼로리 링과 잔여량 계산의 기준이 된다. 설정 화면에서 언제든 재수정 가능하다.
- **Data:** UserGoal, AppFlags
- **API:** 없음
- **Requirements:**

**AC-1 [E][P0]: Scenario: 목표 저장 성공**
- Given `fct:flags.onboarded === false` 인 신규 사용자
- When `/onboarding`에서 `{ goalType: 'lose', dailyKcal: 1600, carbRatio: 40, proteinRatio: 35, fatRatio: 25 }` 입력 후 "시작하기" 탭
- Then `fct:goal`에 저장되고 `fct:flags.onboarded`가 `true`로 변경됨
- And `navigate('/', { replace: true })`로 홈 이동

**AC-2 [E][P0]: Scenario: 목표 유형별 기본 칼로리 프리셋**
- Given 온보딩 화면
- When goalType Chip에서 "감량" 선택
- Then dailyKcal TextField 값이 `1600`으로 자동 채워짐 (유지=2000, 증량=2400)

**AC-3 [W][P1]: Scenario: 범위 밖 칼로리 거부**
- Given 온보딩 화면
- When dailyKcal에 `500` 입력 후 "시작하기" 탭
- Then 저장되지 않고 TextField 하단에 "800~5000 사이로 입력해주세요" 에러 텍스트 표시

**AC-4 [W][P1]: Scenario: 탄단지 비율 합 불일치 거부**
- Given 온보딩 화면
- When `{ carbRatio: 40, proteinRatio: 40, fatRatio: 30 }` (합 110) 입력 후 "시작하기" 탭
- Then 저장되지 않고 "탄단지 비율의 합은 100%가 되어야 해요 (현재 110%)" 에러 텍스트 표시

**AC-5 [S][P1]: Scenario: 저장 중 중복 제출 차단**
- While 저장 처리 중인 동안
- The system shall "시작하기" 버튼을 `loading` 상태로 두고 추가 탭 이벤트를 무시한다

**AC-6 [S][P0]: Scenario: 온보딩 미완료 시 강제 리디렉션**
- While `fct:flags.onboarded === false` 인 동안
- The system shall `/onboarding` 외 모든 라우트 진입 시 `/onboarding`으로 `replace` 이동시킨다

**AC-7 [E][P2]: Scenario: 설정에서 목표 재수정**
- Given `fct:goal.dailyKcal === 1600`
- When `/settings/goal`에서 `1800`으로 변경 후 저장
- Then `fct:goal.dailyKcal === 1800`이 되고 "목표를 변경했어요" 토스트 표시
- And 홈의 칼로리 링 분모가 즉시 1800으로 갱신됨

**AC-8 [U][P0]: The system shall 온보딩 화면의 모든 Chip·Button 터치 타겟을 최소 44×44px로 렌더링한다**

---

### F3. 홈 대시보드 (칼로리 링 & 오늘의 기록)

- **Description:** 오늘 섭취 칼로리 대비 목표 잔여량을 링 UI로 시각화하고, 탄단지 진행률과 오늘의 식사 기록 목록을 끼니별로 보여준다. 기록 항목 탭으로 수정/삭제가 가능하며, 하단 고정 CTA로 사진 촬영 플로우에 진입한다.
- **Data:** MealRecord, UserGoal, PremiumState
- **API:** 없음
- **Requirements:**

**AC-1 [U][P0]: Scenario: 잔여 칼로리 계산 및 히어로 표기**
- Given `fct:goal.dailyKcal === 1600`, 오늘 기록 `[{kcal: 210}, {kcal: 520}]`
- When `/` 진입
- Then `data-testid="calorie-ring"` 요소에 소비 `730`, 잔여 `870`이 표시됨
- And 링 진행률이 `730/1600 = 45.6%` → `46%`(반올림)로 렌더링됨
- And 잔여 칼로리 `870`은 SummaryHero의 CountUp value로 t2 강조 타이포로 표기됨

**AC-2 [U][P0]: Scenario: 목표 초과 상태 표기**
- Given `fct:goal.dailyKcal === 1600`, 오늘 총 섭취 `1850`
- When `/` 진입
- Then 링이 100%로 채워지고 `data-testid="calorie-ring"` 내부에 "250kcal 초과" 텍스트가 `var(--tds-color-red-500)` 계열 토큰으로 표시됨

**AC-3 [U][P0]: Scenario: 끼니별 그룹 렌더링 계약**
- Given 오늘 기록이 아침 1건, 점심 2건, 저녁 0건, 간식 0건일 때
- When `/` 진입
- Then `data-testid="meal-group-breakfast"`, `"meal-group-lunch"`, `"meal-group-dinner"`, `"meal-group-snack"` 4개 Card가 항상 렌더링됨
- And 각 Card 헤더에 해당 끼니 합계 kcal이 표시되고, 기록 0건인 Card에는 "아직 기록이 없어요" 텍스트와 "+ 추가" 버튼이 표시됨

**AC-4 [U][P1]: Scenario: 탄단지 MiniBar 시각화**
- Given `fct:goal`의 비율이 `{carb:40, protein:35, fat:25}`, 오늘 섭취가 `{carbG: 80, proteinG: 60, fatG: 30}` 일 때
- When `/` 진입
- Then `data-testid="macro-bars"` 안에 탄/단/지 MiniBar 3개가 각각 목표 대비 % 수치와 함께 표시됨

**AC-5 [E][P0]: Scenario: 기록 삭제**
- Given 오늘 기록 3건이 표시된 상태
- When 기록 ListRow를 길게 눌러 나타난 BottomSheet에서 "삭제" 탭 → AlertDialog "이 기록을 삭제할까요?"에서 "삭제" 확인
- Then 해당 기록이 `fct:meals`에서 제거되고 "기록을 삭제했어요" 토스트 표시
- And 링의 소비 칼로리가 즉시 재계산됨

**AC-6 [S][P1]: Scenario: 빈 상태**
- While 오늘 기록이 0건인 동안
- The system shall 링 중앙에 목표 칼로리 전체를 잔여량으로 표시하고, 목록 영역에 `Asset.ContentIcon`과 "오늘 첫 끼니를 기록해보세요" 문구를 노출한다

**AC-7 [W][P1]: Scenario: 목표 미설정 방어**
- Given `fct:goal`이 없는 상태로 `/`에 직접 진입했을 때
- Then 링은 기본값 2000kcal 기준으로 렌더링되고, 상단에 "목표를 설정하면 더 정확해요" ListRow(탭 시 `/settings/goal`)가 표시됨

**AC-8 [O][P1]: Scenario: 프리미엄 여부에 따른 광고 노출**
- Where `isPremium() === false`
- The system shall 끼니 그룹 Card와 주간 요약 섹션 **사이**에 `<AdSlot />` 배너를 1개 렌더링한다
- Where `isPremium() === true`
- The system shall `<AdSlot />`을 렌더링하지 않는다

**AC-9 [W][P1]: Scenario: 대량 기록 스크롤**
- Given 오늘 기록이 120건일 때
- When `/` 진입
- Then 리스트는 가상 스크롤로 렌더링되어 초기 DOM 노드 수가 40개 이하로 유지됨

---

### F4. 사진 촬영 → AI 음식 인식

- **Description:** 카메라/갤러리로 음식 사진을 선택해 외부 AI 인식 서버에 전송하고, 한국 음식 후보와 추정 영양소를 받아온다. 무료 사용자는 1일 3회 제한이며 초과 시 보상형 광고 시청으로 1회씩(최대 2회) 추가 획득할 수 있다. 생성형 AI 고지 및 결과 배지를 필수로 노출한다.
- **Data:** UsageQuota, AppFlags, FoodCandidate
- **API:** `POST /api/vision/analyze { imageBase64, mealType } → { items: FoodCandidate[] }`
- **Requirements:**

**AC-1 [E][P0]: Scenario: AI 인식 성공**
- Given 무료 사용자, `fct:quota = { date: 오늘, aiCount: 0, bonusCount: 0 }`
- When `/capture`에서 사진 선택 후 "분석하기" 탭, 서버가 `{ items: [{ foodName: '비빔밥', confidence: 0.91, amountGram: 450, kcal: 620, carbG: 92.0, proteinG: 18.0, fatG: 16.5 }] }` 응답
- Then `fct:quota.aiCount`가 `1`로 증가함
- And `navigate('/result', { state: { candidates: FoodCandidate[], mealType: MealType, source: 'ai_photo' } })` 로 이동함

**AC-2 [E][P0]: Scenario: 생성형 AI 사전 고지**
- Given `fct:flags.aiNoticeAcknowledged === false`
- When 사용자가 `/capture`에 처음 진입할 때
- Then "이 서비스는 생성형 AI를 활용합니다. 분석 결과는 추정치이며 실제 영양성분과 다를 수 있어요" AlertDialog가 1회 표시됨
- And "확인" 탭 시 `fct:flags.aiNoticeAcknowledged`가 `true`로 저장되고 이후 재노출되지 않음

**AC-3 [S][P0]: Scenario: 무료 한도 소진 게이트**
- While `isPremium() === false && quota.aiCount >= 3 + quota.bonusCount` 인 동안
- The system shall "분석하기" 버튼을 비활성화하고, 탭 시 BottomSheet에 "오늘 무료 3회를 모두 사용했어요" 문구와 두 개의 선택지 — "광고 보고 1회 더"(`bonusCount < 2`일 때만 노출), "프리미엄 시작하기"(`/premium`으로 이동) — 를 표시한다

**AC-4 [E][P0]: Scenario: 보상형 광고로 추가 횟수 획득**
- Given `quota = { aiCount: 3, bonusCount: 0 }`
- When BottomSheet에서 "광고 보고 1회 더" 탭 → `<TossRewardAd />` 시청 완료 콜백 수신
- Then `fct:quota.bonusCount`가 `1`로 증가하고 "1회 더 분석할 수 있어요" 토스트 표시
- And "분석하기" 버튼이 다시 활성화됨

**AC-5 [W][P1]: Scenario: 보상형 광고 중도 이탈**
- Given 보상형 광고 재생 중
- When 사용자가 광고를 끝까지 보지 않고 닫음
- Then `bonusCount`가 증가하지 않고 "광고를 끝까지 봐야 추가 분석을 받을 수 있어요" 토스트 표시

**AC-6 [S][P1]: Scenario: 분석 중 로딩 상태**
- While `POST /api/vision/analyze` 응답 대기 중인 동안
- The system shall 전체 화면 오버레이에 "AI가 음식을 분석하고 있어요" 문구와 TDS 로딩 인디케이터를 표시하고, 뒤로가기 외 모든 입력을 차단한다

**AC-7 [W][P1]: Scenario: 네트워크 실패**
- Given `/capture`에서 분석 요청 중
- When fetch가 실패하거나 15초 타임아웃 초과
- Then `quota.aiCount`를 증가시키지 않고 "네트워크 연결을 확인해주세요" 토스트와 "다시 시도" 버튼을 표시함

**AC-8 [W][P1]: Scenario: 인식 실패 응답**
- Given 서버가 `200 { items: [] }` 또는 `422 { error: 'NO_FOOD_DETECTED' }` 응답
- Then `quota.aiCount`를 증가시키지 않고 "음식을 찾지 못했어요. 다시 찍거나 직접 검색해보세요" 문구와 "직접 검색"(`/search` 이동) 버튼을 표시함

**AC-9 [W][P1]: Scenario: 이미지 용량 초과**
- Given 사용자가 선택한 이미지 파일이 8MB 초과일 때
- When "분석하기" 탭
- Then 클라이언트에서 최대 변 1280px, JPEG 품질 0.7로 리사이즈하며, 리사이즈 후에도 2MB 초과 시 "사진 용량이 너무 커요. 다시 촬영해주세요" 토스트 표시하고 요청을 보내지 않음

**AC-10 [U][P0]: The system shall 촬영·업로드한 원본 이미지를 localStorage 또는 서버에 저장하지 않고 분석 응답 수신 즉시 메모리에서 해제한다**

---

### F5. 인식 결과 확인·보정 및 저장

- **Description:** AI 후보 또는 DB 검색 결과를 사용자가 확인하고 음식명·중량·끼니를 보정한 뒤 기록으로 확정하는 화면이다. 중량을 조절하면 칼로리·탄단지가 비례 재계산된다. AI 출처 결과에는 "AI가 생성한 결과입니다" 배지가 상시 표시된다.
- **Data:** MealRecord, FoodCandidate, FoodDbItem
- **API:** 없음 (F4/F6 결과를 `location.state`로 수신)
- **Requirements:**

**AC-1 [E][P0]: Scenario: 기록 확정 저장**
- Given `/result`에 `location.state = { candidates: [{ foodName: '비빔밥', amountGram: 450, kcal: 620, carbG: 92.0, proteinG: 18.0, fatG: 16.5, confidence: 0.91 }], mealType: 'lunch', source: 'ai_photo' }` 로 진입
- When "기록하기" 탭
- Then `fct:meals`에 `{ foodName: '비빔밥', amountGram: 450, kcal: 620, mealType: 'lunch', source: 'ai_photo', aiGenerated: true, edited: false }` 가 저장됨
- And "점심에 기록했어요" 토스트 표시 후 `navigate('/', { replace: true })`

**AC-2 [E][P0]: Scenario: 중량 변경 시 비례 재계산**
- Given 후보가 `{ amountGram: 450, kcal: 620, carbG: 92.0, proteinG: 18.0, fatG: 16.5 }` 일 때
- When 중량 TextField를 `300`으로 변경
- Then kcal이 `413`(620×300/450, 반올림), carbG `61.3`, proteinG `12.0`, fatG `11.0` 으로 즉시 갱신됨
- And 저장 시 `edited: true`로 기록됨

**AC-3 [U][P0]: Scenario: AI 결과물 라벨 표시**
- Given `source === 'ai_photo'` 인 결과가 화면에 표시될 때
- Then `data-testid="ai-badge"` 요소에 "AI가 생성한 결과입니다" 텍스트가 결과 Card 상단에 표시됨
- And 홈 목록의 해당 기록 ListRow에도 동일 배지가 축약 표기("AI")로 노출됨

**AC-4 [U][P0]: Scenario: 결과 화면 레이아웃 계약**
- Given `/result` 진입
- Then 화면은 `ScreenScaffold`로 감싸지고, `data-testid="nutrition-card"` Card 1개(칼로리 히어로 + 탄단지 MiniBar 3개)와 `data-testid="edit-card"` Card 1개(음식명/중량/끼니 입력)가 렌더링됨
- And 대표 칼로리 값은 CountUp 히어로로 t2 타이포로 강조되고, "기록하기" 1차 액션은 `SubmitFooter` 하단 고정으로 배치됨

**AC-5 [S][P1]: Scenario: 다중 후보 선택**
- While `candidates.length >= 2` 인 동안
- The system shall 상단에 후보 Chip 목록(각 `foodName` + `confidence` 백분율)을 표시하고, 선택된 Chip의 영양 정보로 Card 내용을 교체한다

**AC-6 [W][P1]: Scenario: state 없이 직접 진입**
- Given `location.state`가 `undefined`인 상태로 `/result`에 진입
- Then 빈 화면 대신 "표시할 결과가 없어요" 문구와 "홈으로" 버튼을 표시하고, 버튼 탭 시 `navigate('/', { replace: true })`

**AC-7 [W][P1]: Scenario: 잘못된 중량 입력 거부**
- Given `/result` 화면
- When 중량 TextField에 `0` 입력 후 "기록하기" 탭
- Then 저장되지 않고 "중량은 1g 이상 3000g 이하로 입력해주세요" 에러 텍스트 표시

**AC-8 [W][P1]: Scenario: 저장 실패 처리**
- Given `addMeal`이 `{ ok: false, error: 'STORAGE_FULL' }` 반환
- Then 화면을 이동하지 않고 "저장 공간이 부족해요. 오래된 기록을 정리해주세요" 토스트와 "설정에서 정리하기" 버튼을 표시함

**AC-9 [U][P1]: The system shall 중량 TextField 포커스 시 `inputMode="numeric"` 키보드를 띄우고, `SubmitFooter`의 "기록하기" 버튼이 키보드에 가려지지 않도록 키보드 높이만큼 상승시킨다**

---

### F6. 음식 DB 검색 & 편의점 제품 추가

- **Description:** 식약처 공공 영양 DB와 편의점(CU·GS25·세븐일레븐) 제품 데이터를 통합 검색해 수동으로 기록을 추가하는 화면이다. AI 인식 실패 시 대체 경로이자 무료 사용자의 무제한 입력 수단으로 동작한다. 최근 선택 항목 최대 30건을 로컬 캐시해 재입력 비용을 낮춘다.
- **Data:** FoodDbItem, MealRecord, `fct:recentFoods`
- **API:** `GET /api/foods/search?q={query}&limit=20 → { foods: FoodDbItem[] }`
- **Requirements:**

**AC-1 [E][P0]: Scenario: 검색 결과 표시**
- Given `/search` 진입
- When 검색 TextField에 `된장찌개` 입력 후 400ms 디바운스 경과
- Then `GET /api/foods/search?q=된장찌개&limit=20` 호출되고, 응답 `foods` 각 항목이 TDS ListRow(제목=`foodName`, 부제=`brand` + `{servingGram}g당 {kcal}kcal`)로 렌더링됨

**AC-2 [E][P0]: Scenario: 검색 결과 선택 후 결과 화면 이동**
- Given 검색 결과 목록이 표시된 상태
- When `{ foodId: 'mfds_1042', foodName: '된장찌개', servingGram: 400, kcalPer100g: 53 }` ListRow 탭
- Then `navigate('/result', { state: { candidates: [{ foodName: '된장찌개', amountGram: 400, kcal: 212, carbG, proteinG, fatG, confidence: 1 }], mealType, source: 'db_search' } })` 로 이동
- And 해당 항목이 `fct:recentFoods` 맨 앞에 추가됨 (중복이면 기존 항목을 앞으로 이동, 30건 초과 시 마지막 항목 제거)

**AC-3 [S][P1]: Scenario: 검색어 미입력 시 최근 항목 노출**
- While 검색 TextField가 비어 있는 동안
- The system shall `fct:recentFoods`의 항목을 "최근 기록한 음식" 섹션으로 표시하고, 캐시가 비어 있으면 `Asset.ContentIcon`과 "음식 이름을 검색해보세요" 빈 상태를 표시한다

**AC-4 [S][P1]: Scenario: 검색 중 로딩 상태**
- While 검색 API 응답 대기 중인 동안
- The system shall 결과 영역에 TDS 스켈레톤 ListRow 5개를 표시하고 이전 결과를 지운다

**AC-5 [W][P1]: Scenario: 검색 결과 0건**
- Given 서버가 `200 { foods: [] }` 응답
- When 검색어 `zzzz` 입력
- Then "'zzzz' 검색 결과가 없어요" 문구와 "직접 입력하기" 버튼이 표시되고, 탭 시 `navigate('/result', { state: { candidates: [{ foodName: 'zzzz', amountGram: 100, kcal: 0, carbG: 0, proteinG: 0, fatG: 0, confidence: 1 }], mealType, source: 'manual' } })`

**AC-6 [W][P1]: Scenario: 검색 API 오류**
- Given 서버가 `500 { error: 'INTERNAL_ERROR' }` 응답 또는 네트워크 실패
- Then "검색에 실패했어요. 잠시 후 다시 시도해주세요" 문구와 "다시 시도" 버튼을 표시하고, `fct:recentFoods` 섹션은 그대로 유지함

**AC-7 [W][P1]: Scenario: 과도한 요청 방지**
- Given 사용자가 1초 내 5글자를 연속 입력
- Then 400ms 디바운스로 API 호출이 최대 1회만 발생하고, 이전 in-flight 요청은 `AbortController`로 취소됨

**AC-8 [U][P1]: The system shall 검색 결과가 20건을 초과할 수 없도록 `limit=20`을 고정 전송하고, 결과 리스트 각 ListRow의 터치 타겟 높이를 최소 44px로 유지한다**

**AC-9 [U][P2]: The system shall 편의점 제품(`brand !== ''`) ListRow에 브랜드명 Chip("CU"/"GS25"/"세븐일레븐")을 표시한다**

---

### F7. 프리미엄 이용권 결제 (IAP)

- **Description:** 30일 프리미엄 이용권(₩6,900)을 `TossPurchase` 컴포넌트로 판매한다. 결제 완료 시 `fct:premium`에 만료 시각을 기록하고 AI 인식 무제한·주간 리포트·광고 제거 혜택을 즉시 활성화한다. 만료 임박 시 홈에서 재구매를 안내한다.
- **Data:** PremiumState, UsageQuota
- **API:** 없음 (토스 IAP SDK 사용)
- **Requirements:**

**AC-1 [E][P0]: Scenario: 결제 성공 및 권한 부여**
- Given `fct:premium = { active: false, expiresAt: 0, lastOrderId: '' }`
- When `/premium`에서 `<TossPurchase sku={import.meta.env.VITE_TOSS_IAP_SKU} />` 결제가 완료되어 `onPurchased({ orderId: 'ord_9001' })` 콜백 수신
- Then `processProductGrant`가 `fct:premium`을 `{ active: true, expiresAt: 현재시각 + 30일(ms), lastOrderId: 'ord_9001' }` 로 갱신함
- And "프리미엄이 시작됐어요" 토스트 표시 후 `navigate('/', { replace: true })`

**AC-2 [E][P0]: Scenario: 유효기간 연장 결제**
- Given `fct:premium.active === true` 이고 만료까지 5일 남은 상태
- When 추가 결제가 완료됨
- Then `expiresAt`이 기존 만료 시각 기준 +30일로 연장됨 (현재 시각 기준이 아님)

**AC-3 [S][P0]: Scenario: 프리미엄 혜택 적용**
- While `isPremium() === true` 인 동안
- The system shall (a) `/capture`의 일일 3회 제한 게이트를 적용하지 않고, (b) 모든 화면에서 `<AdSlot />`을 렌더링하지 않으며, (c) `/report`의 주간 리포트 잠금을 해제한다

**AC-4 [S][P1]: Scenario: 결제 진행 중 상태**
- While IAP 주문 처리 중인 동안
- The system shall 결제 버튼을 `loading` 상태로 두고 "결제를 진행하고 있어요" 문구를 표시하며 뒤로가기 이외의 조작을 차단한다

**AC-5 [W][P1]: Scenario: 결제 취소**
- Given 사용자가 토스 결제 시트에서 취소함
- Then `fct:premium`은 변경되지 않고, "결제를 취소했어요" 토스트만 표시하며 `/premium` 화면에 머무름

**AC-6 [W][P1]: Scenario: 결제 실패**
- Given IAP SDK가 결제 실패 에러를 반환
- Then `fct:premium`은 변경되지 않고 "결제에 실패했어요. 잠시 후 다시 시도해주세요" 문구와 "다시 시도" 버튼을 표시함
- And `console.error`를 호출하지 않음

**AC-7 [E][P1]: Scenario: 만료 임박 안내**
- Given `fct:premium.active === true` 이고 만료까지 3일 이하 남은 상태
- When `/` 진입
- Then 홈 상단에 "프리미엄이 {n}일 후 만료돼요" ListRow가 표시되고 탭 시 `/premium`으로 이동함

**AC-8 [U][P0]: The system shall `/premium` 화면에 "30일 이용권 · ₩6,900 · 자동 갱신되지 않습니다" 문구를 명시하고, 외부 결제 페이지·앱 설치 유도 문구·외부 링크를 포함하지 않는다**

**AC-9 [U][P1]: The system shall 혜택 목록을 `data-testid="premium-benefits"` Card 안에 3개 ListRow("AI 사진 인식 무제한", "주간 영양 리포트", "광고 없이 이용")로 렌더링한다**

---

### F8. 주간 영양 리포트 (프리미엄)

- **Description:** 최근 7일간의 칼로리 섭취 추이와 목표 달성률, 탄단지 평균 비율, 가장 자주 먹은 음식 TOP 3를 요약해 보여주는 화면이다. 프리미엄 사용자에게만 전체 내용이 공개되며, 무료 사용자에게는 블러 처리된 미리보기와 업그레이드 CTA가 표시된다.
- **Data:** MealRecord, UserGoal, PremiumState
- **API:** 없음 (로컬 집계)
- **Requirements:**

**AC-1 [U][P0]: Scenario: 주간 집계 정확도**
- Given 최근 7일(오늘 포함) 기록 총 kcal이 `[1500, 1800, 0, 1650, 2100, 1400, 1600]`, `fct:goal.dailyKcal === 1600`
- When `/report` 진입 (프리미엄)
- Then 일평균 `1436kcal`(10050/7, 반올림), 목표 달성일 수 `3일`(±10% 이내 = 1440~1760 범위: 1500, 1650, 1600)이 표시됨

**AC-2 [U][P0]: Scenario: 리포트 레이아웃 계약**
- Given `/report` 진입 (프리미엄)
- Then `data-testid="report-summary-card"` Card(일평균 kcal CountUp 히어로 + 목표 달성일 수), `data-testid="trend-card"` Card(7일 kcal Sparkline + 목표선), `data-testid="macro-card"` Card(탄단지 평균 MiniBar 3개), `data-testid="top-foods-card"` Card(TOP 3 ListRow)가 이 순서로 렌더링됨
- And 화면은 `ScreenScaffold`로 감싸짐

**AC-3 [U][P0]: Scenario: 자주 먹은 음식 TOP 3**
- Given 7일 기록의 `foodName` 빈도가 `{ '비빔밥': 4, '아메리카노': 3, '된장찌개': 3, '샐러드': 1 }`
- When `/report` 진입
- Then TOP 3에 `비빔밥(4회)`, `아메리카노(3회)`, `된장찌개(3회)`가 표시되며, 동률은 `foodName` 가나다순으로 정렬됨

**AC-4 [S][P0]: Scenario: 무료 사용자 잠금**
- While `isPremium() === false` 인 동안
- The system shall `data-testid="trend-card"`·`"macro-card"`·`"top-foods-card"`에 블러 오버레이와 잠금 아이콘을 적용하고, 하단에 `SubmitFooter`로 "프리미엄으로 전체 리포트 보기"(`/premium` 이동) 버튼을 고정 노출한다
- And `data-testid="report-summary-card"`의 일평균 kcal은 잠금 없이 공개한다

**AC-5 [S][P1]: Scenario: 기록 부족 상태**
- While 최근 7일 기록이 0건인 동안
- The system shall 차트 대신 `Asset.ContentIcon`과 "3일 이상 기록하면 리포트를 볼 수 있어요" 문구, "기록하러 가기"(`/capture` 이동) 버튼을 표시한다

**AC-6 [S][P1]: Scenario: 집계 로딩 상태**
- While 7일 집계 계산이 완료되지 않은 동안
- The system shall 각 Card 위치에 TDS 스켈레톤 블록을 표시한다

**AC-7 [W][P1]: Scenario: 손상된 기록 방어**
- Given `fct:meals`에 `kcal`이 `NaN` 또는 `null`인 항목이 1건 섞여 있을 때
- When `/report` 진입
- Then 해당 항목을 집계에서 제외하고 나머지로 계산하며, 화면 크래시나 `NaN` 문자열 노출이 발생하지 않음

**AC-8 [W][P1]: Scenario: 목표 0 나눗셈 방어**
- Given `fct:goal.dailyKcal`이 `0`으로 손상된 상태
- Then 달성률 계산 시 기본값 `2000`을 사용하고 `Infinity`/`NaN`을 표시하지 않음

**AC-9 [O][P1]: Scenario: 무료 사용자 광고 배치**
- Where `isPremium() === false`
- The system shall `report-summary-card`와 잠긴 카드 섹션 **사이**에 `<AdSlot />` 배너 1개를 콘텐츠와 겹치지 않게 렌더링한다

---

## Screen Definitions

### S1. 온보딩 — `/onboarding`
- **TDS 컴포넌트:** Top(타이틀 "목표를 알려주세요"), Chip(감량/유지/증량), TDS TextField(일일 목표 칼로리, `inputMode="numeric"`), TDS TextField ×3(탄·단·지 비율), Paragraph.Text(설명), Spacing, TDS Button(SubmitFooter 내 "시작하기", `display="block"`)
- **레이아웃 계약:** `ScreenScaffold` > Top > 목표유형 Chip 그룹 > `Card`(칼로리 입력) > `Card`(탄단지 비율) > `SubmitFooter`(하단 고정 1차 액션). 좌측 글자폭 버튼 금지.
- **로딩:** 저장 중 "시작하기" 버튼 `loading` 상태.
- **빈 상태:** 해당 없음 (항상 프리셋 값 존재).
- **에러:** 각 TextField 하단 인라인 에러 텍스트("800~5000 사이로 입력해주세요", "탄단지 비율의 합은 100%가 되어야 해요 (현재 {n}%)").
- **터치:** Chip 높이 48px, SubmitFooter 버튼 높이 56px.
- **키보드:** 칼로리/비율 TextField 포커스 시 숫자 키보드, SubmitFooter가 키보드 위로 상승.
- **Navigation state contract**
  - Incoming: `location.state` 미사용 (`undefined`)
  - Outgoing: "시작하기" → `navigate('/', { replace: true })` — state 없음

### S2. 홈 대시보드 — `/`
- **TDS 컴포넌트:** Top, Card(끼니 그룹 ×4, 주간 요약), ListRow(기록 항목), Chip(오늘/어제 날짜 전환), BottomSheet(항목 액션), AlertDialog(삭제 확인), Toast, Spacing, TDS Button(SubmitFooter "사진으로 기록하기"), FloatingTabBar(홈/검색/리포트/설정)
- **커스텀:** 칼로리 링은 SVG(TDS 미제공 레이아웃) — `data-testid="calorie-ring"`
- **표현 요소:** SummaryHero(잔여 kcal CountUp, t2), MiniBar ×3(탄단지 `data-testid="macro-bars"`), Sparkline(최근 7일 kcal 미니 추이)
- **레이아웃 계약:** `ScreenScaffold` > Top > 링 히어로 Card > macro-bars Card > `<AdSlot />`(무료만) > 끼니 그룹 Card ×4 > `SubmitFooter`
- **로딩:** 부트스트랩 미완료 시 링·카드 위치에 TDS 스켈레톤.
- **빈 상태:** 기록 0건 → `Asset.ContentIcon` + "오늘 첫 끼니를 기록해보세요".
- **에러:** 저장소 손상 시 기본값으로 렌더링, 상단 "일부 데이터를 불러오지 못했어요" ListRow.
- **터치:** ListRow 최소 높이 56px, 링 중앙 탭 영역 88×88px.
- **스크롤:** 기록 100건 초과 시 가상 스크롤.
- **Navigation state contract**
  - Incoming: `location.state` 미사용
  - Outgoing:
    - "사진으로 기록하기" → `navigate('/capture', { state: { mealType: MealType } })`
    - 끼니 Card "+ 추가" → `navigate('/search', { state: { mealType: MealType } })`
    - 기록 ListRow "수정" → `navigate('/result', { state: { candidates: FoodCandidate[], mealType: MealType, source: FoodSource, editingId: string } })`
    - 만료 임박 배너 → `navigate('/premium')` — state 없음

### S3. 사진 촬영/분석 — `/capture`
- **TDS 컴포넌트:** Top(뒤로가기), Chip(끼니 선택 아침/점심/저녁/간식), TDS Button("카메라로 촬영", "앨범에서 선택"), TDS Button(SubmitFooter "분석하기"), AlertDialog(생성형 AI 고지), BottomSheet(한도 소진 안내), Toast, Paragraph.Text
- **커스텀:** 선택 이미지 프리뷰 영역(aspect-ratio 1:1 flex 레이아웃)
- **레이아웃 계약:** `ScreenScaffold` > Top > 끼니 Chip 그룹 > 프리뷰 Card > 촬영/앨범 버튼 2개 > `SubmitFooter`("분석하기", `display="block"`)
- **로딩:** 분석 중 전체 화면 오버레이 + "AI가 음식을 분석하고 있어요" + 로딩 인디케이터.
- **빈 상태:** 이미지 미선택 시 프리뷰 자리에 `Asset.ContentIcon` + "음식 사진을 올려주세요", "분석하기" 버튼 비활성.
- **에러:** 네트워크 실패/인식 실패/용량 초과 각각 지정 문구 토스트 + "다시 시도" 또는 "직접 검색" 버튼.
- **터치:** 촬영/앨범 버튼 높이 56px, 끼니 Chip 48px.
- **Navigation state contract**
  - Incoming: `location.state = { mealType: MealType } | undefined` (undefined면 현재 시각 기준 자동 추론: 04–10시 breakfast, 10–15시 lunch, 15–21시 dinner, 그 외 snack)
  - Outgoing:
    - 분석 성공 → `navigate('/result', { state: { candidates: FoodCandidate[], mealType: MealType, source: 'ai_photo' } })`
    - "직접 검색" → `navigate('/search', { state: { mealType: MealType } })`
    - "프리미엄 시작하기" → `navigate('/premium')`

### S4. 결과 확인/보정 — `/result`
- **TDS 컴포넌트:** Top("기록 확인"), Chip(다중 후보 선택, 끼니 재선택), Card ×2, TDS TextField(음식명 / 중량 `inputMode="numeric"`), Paragraph.Text, TDS Button(SubmitFooter "기록하기"), Toast, TossRewardAd(무료 사용자 결과 게이트)
- **표현 요소:** SummaryHero(kcal CountUp, t2 강조), MiniBar ×3(탄단지), AI 배지 `data-testid="ai-badge"`
- **레이아웃 계약:** `ScreenScaffold` > Top > 후보 Chip(2개 이상일 때) > `data-testid="nutrition-card"` Card > `data-testid="edit-card"` Card > `SubmitFooter`
- **로딩:** 저장 중 "기록하기" 버튼 `loading`.
- **빈 상태:** `location.state === undefined` → "표시할 결과가 없어요" + "홈으로" 버튼.
- **에러:** 중량 범위 위반 인라인 에러, 저장 실패 토스트 + "설정에서 정리하기".
- **터치:** Chip 48px, SubmitFooter 버튼 56px.
- **키보드:** 중량 포커스 시 숫자 키보드 + SubmitFooter 상승.
- **보상형 광고 게이트 AC**
  - **AC [E][P1]: Scenario: 결과 보기 전 보상형 광고**
    - Given 무료 사용자가 `quota.aiCount >= 3` 상태에서 "광고 보고 1회 더"를 선택해 분석을 완료했을 때
    - When `<TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}>` 광고 시청이 완료됨
    - Then `data-testid="nutrition-card"` 결과 Card가 표시됨
- **Navigation state contract**
  - Incoming: `location.state = { candidates: FoodCandidate[]; mealType: MealType; source: FoodSource; editingId?: string }`
  - Outgoing:
    - "기록하기" → `navigate('/', { replace: true })` — state 없음
    - "홈으로" → `navigate('/', { replace: true })` — state 없음

### S5. 음식 검색 — `/search`
- **TDS 컴포넌트:** Top("음식 검색"), TDS TextField(검색어, `type="search"`), ListRow(검색 결과 / 최근 항목), Chip(브랜드 표기, 끼니 선택), Paragraph.Text, TDS Button("직접 입력하기", "다시 시도"), Spacing, FloatingTabBar
- **레이아웃 계약:** `ScreenScaffold` > Top > 검색 TextField(sticky) > 끼니 Chip 그룹 > 결과 리스트(Card로 섹션 구분: "검색 결과" / "최근 기록한 음식")
- **로딩:** 스켈레톤 ListRow 5개.
- **빈 상태:** 검색어 없음 → 최근 항목 섹션 / 최근 항목도 없음 → `Asset.ContentIcon` + "음식 이름을 검색해보세요". 결과 0건 → "'{q}' 검색 결과가 없어요" + "직접 입력하기".
- **에러:** "검색에 실패했어요. 잠시 후 다시 시도해주세요" + "다시 시도" 버튼.
- **터치:** ListRow 최소 56px.
- **스크롤:** 결과 최대 20건이므로 일반 스크롤. 최근 항목 30건도 일반 스크롤.
- **키보드:** 진입 시 검색 TextField 자동 포커스, 스크롤 시작 시 키보드 dismiss.
- **Navigation state contract**
  - Incoming: `location.state = { mealType: MealType } | undefined`
  - Outgoing: 결과 선택 / "직접 입력하기" → `navigate('/result', { state: { candidates: FoodCandidate[], mealType: MealType, source: 'db_search' | 'manual' } })`

### S6. 프리미엄 — `/premium`
- **TDS 컴포넌트:** Top("프리미엄"), Card(`data-testid="premium-benefits"`), ListRow ×3(혜택), Paragraph.Text(가격·비자동갱신 고지), TossPurchase(SubmitFooter 영역), Toast
- **레이아웃 계약:** `ScreenScaffold` > Top > 혜택 Card > 가격 고지 Paragraph.Text > `SubmitFooter`(TossPurchase 결제 버튼, `display="block"`)
- **로딩:** 결제 처리 중 버튼 `loading` + "결제를 진행하고 있어요".
- **빈 상태:** 해당 없음.
- **에러:** 취소 → "결제를 취소했어요" 토스트. 실패 → "결제에 실패했어요. 잠시 후 다시 시도해주세요" + "다시 시도".
- **터치:** 결제 버튼 높이 56px.
- **Navigation state contract**
  - Incoming: `location.state` 미사용
  - Outgoing: 결제 성공 → `navigate('/', { replace: true })` — state 없음

### S7. 주간 리포트 — `/report`
- **TDS 컴포넌트:** Top("주간 리포트"), Card ×4, ListRow(TOP 3 음식), Paragraph.Text, TDS Button(SubmitFooter "프리미엄으로 전체 리포트 보기" — 무료만), Spacing, FloatingTabBar
- **표현 요소:** SummaryHero(일평균 kcal CountUp), Sparkline(7일 kcal 추이 + 목표선), MiniBar ×3(탄단지 평균 비율)
- **레이아웃 계약:** `ScreenScaffold` > Top > `report-summary-card` > `<AdSlot />`(무료만) > `trend-card` > `macro-card` > `top-foods-card` > (무료면) `SubmitFooter`
- **로딩:** 각 Card 위치 스켈레톤.
- **빈 상태:** 7일 기록 0건 → `Asset.ContentIcon` + "3일 이상 기록하면 리포트를 볼 수 있어요" + "기록하러 가기".
- **에러:** 손상 데이터는 집계 제외, `NaN` 미노출.
- **터치:** TOP 3 ListRow 56px, CTA 56px.
- **Navigation state contract**
  - Incoming: `location.state` 미사용
  - Outgoing: "프리미엄으로 전체 리포트 보기" → `navigate('/premium')`; "기록하러 가기" → `navigate('/capture', { state: { mealType: MealType } })`

### S8. 설정 / 목표 수정 — `/settings`, `/settings/goal`
- **TDS 컴포넌트:** Top, ListRow(목표 수정, 데이터 정리, 프리미엄 상태, 이용약관), Switch(다크모드 자동 — OS 설정 따름 표기), TDS TextField(목표 수정 화면), AlertDialog(데이터 전체 삭제 확인), TDS Button(SubmitFooter "저장"), Toast
- **레이아웃 계약:** `ScreenScaffold` > Top > 섹션별 Card > ListRow 나열. 목표 수정 화면은 S1과 동일한 입력 계약을 재사용.
- **로딩:** 저장 중 버튼 `loading`.
- **빈 상태:** 해당 없음.
- **에러:** S1과 동일한 인라인 에러 문구.
- **터치:** ListRow 56px, Switch 터치 영역 44×44px.
- **Navigation state contract**
  - Incoming: `location.state` 미사용
  - Outgoing: "목표 수정" → `navigate('/settings/goal')`; 저장 후 → `navigate(-1)`

---

## 토스 검수 통과 ACs (전역)

**AC-G1 [W][P0]: Scenario: 외부 도메인 이탈 차단**
- Given 앱의 모든 화면
- When 코드가 `window.location.href = <외부 URL>` 또는 `window.open(<외부 URL>)` 을 호출하려 할 때
- Then 해당 호출이 코드베이스에 존재하지 않으며, 정적 검사(`grep -r "window.open\|window.location.href" src/`)의 매치 수가 0이다

**AC-G2 [U][P0]: Scenario: 콘솔 에러 0개**
- Given 프로덕션 빌드(`vite build`) 결과물
- When 온보딩 → 홈 → 촬영 → 결과 → 검색 → 리포트 → 프리미엄 전체 플로우를 1회 순회
- Then `console.error` 호출 횟수가 0이다

**AC-G3 [U][P0]: Scenario: CORS 정상 동작**
- Given 외부 API 서버(Railway)
- When 미니앱 오리진에서 `POST /api/vision/analyze` 및 `GET /api/foods/search` 를 호출
- Then 응답 헤더에 `Access-Control-Allow-Origin`이 포함되어 CORS 에러가 0건이다

**AC-G4 [U][P0]: Scenario: 구버전 OS 호환**
- Given Android 7 / iOS 16 WebView 환경
- Then `Array.prototype.at`, `Object.groupBy`, `structuredClone`, `Array.prototype.findLast` 미사용이며 앱이 크래시 없이 전체 플로우를 완주한다

**AC-G5 [W][P0]: Scenario: 앱 설치 유도 금지**
- Given 앱의 모든 텍스트 리소스
- Then "앱을 설치", "다운로드", "스토어에서 받기" 문구 및 관련 배너·링크가 0개이다

**AC-G6 [W][P0]: Scenario: 외부 링크 제한**
- Given 앱의 모든 화면
- Then 서비스 본질과 무관한 외부 웹/앱 이동 링크가 존재하지 않으며, 설정 화면의 이용약관·개인정보처리방침만 앱 내부 라우트(`/settings/terms`)로 렌더링된다

**AC-G7 [W][P0]: Scenario: 외부 로깅 금지**
- Given `package.json` 의존성 목록
- Then Google Analytics, Amplitude, Mixpanel, Sentry 등 외부 분석/로깅 SDK가 0개이다

**AC-G8 [W][P0]: Scenario: HEX 색상 하드코딩 금지**
- Given `src/` 하위 모든 `.tsx` / `.css` 파일
- When `grep -rE "#[0-9a-fA-F]{3,8}\b" src/` 실행
- Then 매치 수가 0이며, 모든 색상은 `var(--tds-color-*)` 또는 TDS 컴포넌트 기본값을 사용한다
- And 다크모드에서 모든 화면의 텍스트/배경 대비가 유지된다

**AC-G9 [U][P1]: Scenario: 프로모션 지급 한도**
- Where `grantPromotionReward({ promotionCode, amount })` 를 호출하는 경우
- The system shall 호출 전 `amount <= 5000` 을 검증하고, 초과 시 호출하지 않고 `{ ok: false, error: 'REWARD_LIMIT_EXCEEDED' }` 를 반환한다
- (MVP 범위에서는 프로모션 미사용 — 향후 도입 시 적용)

**AC-G10 [U][P0]: Scenario: AI 고지 상시 준수**
- Given AI 추정 결과(`aiGenerated === true`)가 표시되는 모든 위치(`/result` 결과 Card, `/` 기록 ListRow)
- Then "AI가 생성한 결과입니다"(홈에서는 "AI" 축약 배지) 라벨이 예외 없이 표시된다

---

## API Contract (외부 API 서버 — 별도 Railway 배포)

Base URL: `import.meta.env.VITE_API_BASE_URL`
공통: `Content-Type: application/json`, 타임아웃 15초, 에러 응답은 모두 `{ error: string }` 단일 형태.

### 1. AI 음식 인식
```
POST /api/vision/analyze
```
Request:
```ts
interface AnalyzeRequest {
  imageBase64: string;   // data URI 프리픽스 제외, 최대 2MB 상당
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}
```
Response `200`:
```ts
interface AnalyzeResponse {
  items: FoodCandidate[];   // 최대 3개, confidence 내림차순
}
```
Errors:
| 코드 | body | 클라이언트 처리 |
|---|---|---|
| 400 | `{ error: 'INVALID_IMAGE' }` | "사진을 다시 선택해주세요" 토스트 |
| 413 | `{ error: 'IMAGE_TOO_LARGE' }` | "사진 용량이 너무 커요. 다시 촬영해주세요" 토스트 |
| 422 | `{ error: 'NO_FOOD_DETECTED' }` | "음식을 찾지 못했어요. 다시 찍거나 직접 검색해보세요" + "직접 검색" |
| 429 | `{ error: 'RATE_LIMITED' }` | "요청이 많아요. 잠시 후 다시 시도해주세요" 토스트 |
| 500 | `{ error: 'INTERNAL_ERROR' }` | "분석에 실패했어요. 다시 시도해주세요" + "다시 시도" |

> 모든 에러 케이스에서 `fct:quota.aiCount`를 증가시키지 않는다.

### 2. 음식 DB 검색
```
GET /api/foods/search?q={string}&limit={number}
```
Query:
```ts
interface SearchQuery {
  q: string;       // 1~30자, URL 인코딩
  limit: number;   // 고정 20
}
```
Response `200`:
```ts
interface SearchResponse {
  foods: FoodDbItem[];   // 0~20개
}
```
Errors:
| 코드 | body | 클라이언트 처리 |
|---|---|---|
| 400 | `{ error: 'INVALID_QUERY' }` | "검색어를 1자 이상 입력해주세요" 인라인 에러 |
| 429 | `{ error: 'RATE_LIMITED' }` | "잠시 후 다시 시도해주세요" 토스트 |
| 500 | `{ error: 'INTERNAL_ERROR' }` | "검색에 실패했어요. 잠시 후 다시 시도해주세요" + "다시 시도" |

### 3. 바코드 조회 (Post-MVP — Open Question Q2 해소 시 구현)
```
GET /api/foods/barcode/{code}
```
Response `200`: `{ food: FoodDbItem }` / `404 { error: 'NOT_FOUND' }`

---

## Assumptions

1. **AI 인식 서버 존재:** 한국 음식 특화 비전 모델을 호스팅한 외부 API 서버(Railway)가 별도로 구축되어 있으며, 미니앱은 클라이언트로만 동작한다. 서버는 사용자 이미지·기록을 저장하지 않는다.
2. **식약처 DB 사전 적재:** 식품의약품안전처 공공 영양 DB와 편의점 3사 제품 데이터는 API 서버 측에 사전 적재되어 있고, 미니앱은 조회만 수행한다.
3. **구독 미지원:** 토스 IAP는 `createOneTimePurchaseOrder` 기반이므로 자동갱신 구독 대신 **30일 기간제 이용권**으로 구현한다. PRD의 "₩6,900/월"은 "30일 ₩6,900"으로 해석한다.
4. **크라우드소싱 제외:** PRD Core Feature 3의 "크라우드소싱 데이터 보강"은 사용자 제보 수집·검수 백엔드가 필요하므로 MVP 범위에서 제외한다.
5. **배달앱 연동 제외:** 배달의민족·쿠팡이츠는 공식 공개 API가 없고 외부 링크 이동이 토스 검수 정책에 저촉되므로 MVP에서 제외한다. 인기 배달 메뉴는 F6의 일반 음식 DB에 포함되는 것으로 대체한다.
6. **날짜 기준:** 모든 `date`는 KST(UTC+9) 기준으로 계산하며, 하루 경계는 00:00 KST이다.
7. **다크모드:** OS 설정을 따르며 앱 내 별도 토글을 제공하지 않는다.
8. **단일 기기:** 데이터는 localStorage에만 존재하므로 기기 간 동기화·백업은 제공하지 않는다. 설정 화면에 이 사실을 명시한다.

---

## Open Questions

| # | 질문 | 영향 범위 | 기본 가정 (미해소 시) |
|---|---|---|---|
| Q1 | AI 인식 서버의 실제 응답 레이턴시는? 15초 타임아웃이 충분한가 | F4 AC-7 | 15초 유지, 초과 시 재시도 UI |
| Q2 | 토스 WebView에서 카메라 기반 바코드 스캔(`BarcodeDetector` / getUserMedia)이 iOS 16·Android 7에서 동작하는가 | F6, API #3 | 동작 미확인 → MVP는 **텍스트 검색만** 제공, 바코드는 Post-MVP |
| Q3 | 토스 IAP SKU가 기간제 이용권(비자동갱신) 판매를 허용하는가, 콘솔 등록 시 제약이 있는가 | F7 전체 | 1회성 상품으로 등록 가능하다고 가정 |
| Q4 | 앱인토스 콘솔에서 발급되는 광고 슬롯이 배너·보상형 각각 별도인가 | F3 AC-8, F4 AC-4 | `VITE_TOSS_AD_GROUP_ID`(배너), `VITE_TOSS_AD_SLOT_ID`(보상형) 별도 발급 가정 |
| Q5 | 무료 3회 제한을 localStorage로만 관리하면 앱 삭제·재설치로 우회 가능 — 서버 측 사용자 식별이 필요한가 | F4 AC-3 | MVP는 localStorage 기반 유지, 남용률 관측 후 `getIsTossLoginIntegratedService()` 연동 검토 |
| Q6 | 프리미엄 이용권 만료 시각을 클라이언트 시계로만 판정하면 기기 시간 조작으로 우회 가능 — 서버 검증이 필요한가 | F7 AC-1, AC-3 | MVP는 클라이언트 판정, 결제 주문 이력 기반 서버 검증은 Post-MVP |
| Q7 | 생성형 AI 고지 문구가 법정 요구 문구를 충족하는가 (법무 검토 필요) | P5, F4 AC-2, F5 AC-3 | 현재 문구로 진행, 검수 피드백 시 즉시 수정 |
| Q8 | 리포트 "목표 달성"의 정의 — ±10% 허용 범위가 적절한가 | F8 AC-1 | ±10%(1440~1760 for 1600) 기준 적용 |