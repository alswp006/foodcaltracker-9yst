// TDD red-phase stub — intentionally incomplete. Real implementation is the
// Coder's job for packet 0008; this exists only so `tsc --noEmit` resolves the
// import while packet-0008.test.ts asserts the real behavior (and fails red).
export function CalorieRing({ percent }: { percent: number }) {
  void percent;
  return <div data-testid="calorie-ring" />;
}
