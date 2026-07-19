import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { render, screen } from "@testing-library/react";
import { mockTds } from "@/__tests__/__helpers__/mocks";

mockTds();

// Source files under test — imported after mockTds() so @toss/tds-mobile
// usages inside them (Paragraph.Text, Badge) resolve to the jsdom-safe mocks.
import { CalorieRing } from "@/components/CalorieRing";
import { MacroMiniBar } from "@/components/MacroMiniBar";
import { AiBadge } from "@/components/AiBadge";

const COMPONENT_FILES = [
  "src/components/CalorieRing.tsx",
  "src/components/MacroMiniBar.tsx",
  "src/components/AiBadge.tsx",
];

function readComponentSource(relPath: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), relPath), "utf-8");
}

// Locate the SVG <circle> that carries the progress stroke-dasharray
// (as opposed to a plain background track circle with no dasharray set).
function findProgressCircle(container: HTMLElement): SVGCircleElement | undefined {
  const circles = Array.from(container.querySelectorAll("circle"));
  return circles.find((c) => {
    const attr = c.getAttribute("stroke-dasharray") || c.style.strokeDasharray;
    return !!attr && attr.trim().length > 0 && attr.trim() !== "none";
  });
}

describe("공용 표현 컴포넌트 (칼로리 링 / MacroMiniBar / AI 배지)", () => {
  describe("AC-1[P0]: CalorieRing renders progress via SVG stroke-dasharray", () => {
    it("AC-1[P0]: renders dasharray proportional to percent=46 of the circle circumference", () => {
      const { container } = render(React.createElement(CalorieRing, { percent: 46 }));

      const circle = findProgressCircle(container);
      expect(circle).toBeDefined();

      const r = parseFloat(circle!.getAttribute("r") || "0");
      expect(r).toBeGreaterThan(0);

      const dasharray = (circle!.getAttribute("stroke-dasharray") || circle!.style.strokeDasharray)!;
      const [filled] = dasharray
        .split(/[\s,]+/)
        .map((n) => parseFloat(n))
        .filter((n) => !Number.isNaN(n));

      const circumference = 2 * Math.PI * r;
      const expectedFilled = (46 / 100) * circumference;
      expect(Math.abs(filled - expectedFilled)).toBeLessThan(1);
    });

    it("AC-1[P0]: clamps percent > 100 to a full ring and applies var(--tds-color-red-500) token", () => {
      const { container } = render(React.createElement(CalorieRing, { percent: 130 }));

      const circle = findProgressCircle(container);
      expect(circle).toBeDefined();

      const r = parseFloat(circle!.getAttribute("r") || "0");
      const dasharray = (circle!.getAttribute("stroke-dasharray") || circle!.style.strokeDasharray)!;
      const [filled] = dasharray
        .split(/[\s,]+/)
        .map((n) => parseFloat(n))
        .filter((n) => !Number.isNaN(n));
      const circumference = 2 * Math.PI * r;

      // Over 100%, the ring must render as fully filled (clamped to 100%), not overflow past a full circle.
      expect(Math.abs(filled - circumference)).toBeLessThan(1);

      const stroke = circle!.getAttribute("stroke") || circle!.style.stroke || "";
      expect(stroke).toContain("var(--tds-color-red-500");
    });

    it("does NOT use the red-500 over-limit token when percent is within range", () => {
      const { container } = render(React.createElement(CalorieRing, { percent: 46 }));
      const circle = findProgressCircle(container);
      const stroke = circle!.getAttribute("stroke") || circle!.style.stroke || "";
      expect(stroke).not.toContain("red-500");
    });
  });

  describe("AC-2[P0]: CalorieRing root exposes data-testid=\"calorie-ring\"", () => {
    it("AC-2[P0]: root element has data-testid calorie-ring", () => {
      render(React.createElement(CalorieRing, { percent: 50 }));
      expect(screen.getByTestId("calorie-ring")).toBeInTheDocument();
    });
  });

  describe("AC-3[P0]: MacroMiniBar renders label/current/target and a ratio bar", () => {
    it("AC-3[P0]: renders label text and current/target grams, with a 40% progressbar for 80/200", () => {
      render(
        React.createElement(MacroMiniBar, { label: "탄수화물", current: 80, target: 200 }),
      );

      expect(screen.getByText("탄수화물")).toBeInTheDocument();
      expect(screen.getByText(/80\s*g/)).toBeInTheDocument();
      expect(screen.getByText(/200\s*g/)).toBeInTheDocument();

      const bar = screen.getByRole("progressbar");
      expect(bar).toHaveAttribute("aria-valuenow", "40");
    });

    it("AC-3[P0]: renders a 0% bar without crashing when target is 0", () => {
      expect(() =>
        render(React.createElement(MacroMiniBar, { label: "단백질", current: 50, target: 0 })),
      ).not.toThrow();

      const bar = screen.getByRole("progressbar");
      expect(bar).toHaveAttribute("aria-valuenow", "0");
      expect(screen.getByText(/50\s*g/)).toBeInTheDocument();
    });
  });

  describe("AC-4[P0]: AiBadge renders the AI-generated-result notice via TDS Badge", () => {
    it("AC-4[P0]: renders \"AI가 생성한 결과입니다\" inside a status role (TDS Badge)", () => {
      render(React.createElement(AiBadge));
      const badge = screen.getByRole("status");
      expect(badge).toHaveTextContent("AI가 생성한 결과입니다");
    });
  });

  describe("AC-5[P1]: no hardcoded HEX colors across the three components", () => {
    it("AC-5[P1]: source files contain zero HEX color literals", () => {
      const hexPattern = /#[0-9a-fA-F]{3,8}\b/g;
      for (const file of COMPONENT_FILES) {
        const source = readComponentSource(file);
        const matches = source.match(hexPattern) ?? [];
        expect(matches, `${file} should contain no HEX colors, found: ${matches.join(", ")}`).toEqual(
          [],
        );
      }
    });

    it("AC-5[P1]: source files reference TDS/adaptive CSS variable tokens for color, not raw values", () => {
      const combined = COMPONENT_FILES.map(readComponentSource).join("\n");
      expect(combined).toMatch(/var\(--(tds-color|adaptive)/);
    });
  });
});
