import type { ReactNode } from "react";

/**
 * 칼로리 도넛 링 — SVG stroke-dasharray 기반 진행률.
 *
 * Pre-built: 100% 초과 시 var(--tds-color-red-500) 계열로 초과를 알린다.
 * children 슬롯에 SummaryHero의 핵심 숫자(Amount/CountUp)를 얹어 중앙에 앵커한다.
 */
export function CalorieRing({
  percent,
  size = 120,
  strokeWidth = 12,
  children,
}: {
  /** 0~100 (그 이상은 100%로 클램프되고 초과 색으로 표시) */
  percent: number;
  size?: number;
  strokeWidth?: number;
  children?: ReactNode;
}) {
  const isOverLimit = percent > 100;
  const clamped = Math.max(0, Math.min(100, percent));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (clamped / 100) * circumference;
  const center = size / 2;

  return (
    <div
      data-testid="calorie-ring"
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--tds-color-grey-200)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={isOverLimit ? "var(--tds-color-red-500)" : "var(--tds-color-blue-500)"}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </svg>
      {children ? (
        <div
          style={{
            position: "absolute",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
