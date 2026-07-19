import { Badge } from "@toss/tds-mobile";

/**
 * AI 생성 결과 고지 배지 — "AI가 생성한 결과입니다" (spec P5 / AC-G10, 상시 표시 의무).
 *
 * Pre-built: `/result` 결과 Card 상단은 기본(전체 문구), 홈 기록 ListRow처럼
 * 공간이 좁은 곳은 `compact`로 "AI" 축약 표기(AC-3/AC-G10 — 두 위치 모두 예외 없이 노출).
 */
export function AiBadge({ compact = false }: { compact?: boolean }) {
  const label = compact ? "AI" : "AI가 생성한 결과입니다";
  const size = compact ? "xsmall" : "small";

  return (
    <span data-testid="ai-badge">
      <Badge size={size} variant="weak" color="blue">
        {label}
      </Badge>
    </span>
  );
}
