import { Paragraph } from "@toss/tds-mobile";

/**
 * 탄단지 가로 막대 — 라벨 + 현재/목표 g + 비율 막대.
 *
 * Pre-built: target=0(목표 미설정)이어도 0으로 나누지 않고 0% 막대로 안전하게 렌더한다.
 */
export function MacroMiniBar({
  label,
  current,
  target,
}: {
  label: string;
  current: number;
  target: number;
}) {
  const ratio = target > 0 ? Math.max(0, Math.min(1, current / target)) : 0;
  const pct = Math.round(ratio * 100);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <Paragraph.Text typography="st12">{label}</Paragraph.Text>
        <Paragraph.Text typography="st12">
          {current}g / {target}g
        </Paragraph.Text>
      </div>
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        style={{
          width: "100%",
          height: 8,
          borderRadius: 8,
          overflow: "hidden",
          backgroundColor: "var(--tds-color-grey-200)",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 8,
            backgroundColor: "var(--tds-color-blue-500)",
          }}
        />
      </div>
    </div>
  );
}
