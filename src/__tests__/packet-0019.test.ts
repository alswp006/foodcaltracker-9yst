import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import fs from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockTds, mockAppsInToss } from "@/__tests__/__helpers__/mocks";
import { seedLocalStorage } from "@/__tests__/__helpers__/test-utils";
import { STORAGE_KEYS, DEFAULT_FLAGS } from "@/lib/types";
import type { AppFlags } from "@/lib/types";

mockTds();
mockAppsInToss();

// Only useNavigate is overridden (CLAUDE.md rule) — Routes/Route/MemoryRouter/
// useLocation stay real so the redirect + active-tab logic under test reacts
// to the actual current route instead of a fixed stub.
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

// useAppReady is mocked so the "not ready" bootstrap-gate branch can be
// observed deterministically — the real hook flips to `true` inside the same
// synchronous act() cycle as the initial render, so its `false` state can't
// otherwise be asserted from a test.
const mockUseAppReady = vi.fn(() => true);
vi.mock("@/lib/hooks", async () => {
  const actual = await vi.importActual<typeof import("@/lib/hooks")>("@/lib/hooks");
  return { ...actual, useAppReady: () => mockUseAppReady() };
});

// Every route's page is stubbed to a single, uniquely-testid'd div so this
// suite verifies ONLY App.tsx's routing/guard/gate wiring — page internals
// get their own packet test files.
vi.mock("@/pages/Home", () => ({
  default: () => React.createElement("div", { "data-testid": "page-home" }, "Home"),
}));
vi.mock("@/pages/Onboarding", () => ({
  default: () => React.createElement("div", { "data-testid": "page-onboarding" }, "Onboarding"),
}));
vi.mock("@/pages/Capture", () => ({
  default: () => React.createElement("div", { "data-testid": "page-capture" }, "Capture"),
}));
vi.mock("@/pages/Result", () => ({
  default: () => React.createElement("div", { "data-testid": "page-result" }, "Result"),
}));
vi.mock("@/pages/Search", () => ({
  default: () => React.createElement("div", { "data-testid": "page-search" }, "Search"),
}));
vi.mock("@/pages/Premium", () => ({
  default: () => React.createElement("div", { "data-testid": "page-premium" }, "Premium"),
}));
vi.mock("@/pages/Report", () => ({
  default: () => React.createElement("div", { "data-testid": "page-report" }, "Report"),
}));
vi.mock("@/pages/Settings", () => ({
  default: () => React.createElement("div", { "data-testid": "page-settings" }, "Settings"),
}));
vi.mock("@/pages/GoalEdit", () => ({
  default: () => React.createElement("div", { "data-testid": "page-goal-edit" }, "GoalEdit"),
}));

import App from "@/App";

const ALL_PAGE_TESTIDS = [
  "page-home",
  "page-onboarding",
  "page-capture",
  "page-result",
  "page-search",
  "page-premium",
  "page-report",
  "page-settings",
  "page-goal-edit",
];

function setFlags(overrides: Partial<AppFlags> = {}) {
  seedLocalStorage({
    [STORAGE_KEYS.flags]: { ...DEFAULT_FLAGS, onboarded: true, ...overrides },
  });
}

function renderAt(pathname: string) {
  return render(
    React.createElement(MemoryRouter, { initialEntries: [pathname] }, React.createElement(App)),
  );
}

function renderedPageCount(): number {
  return ALL_PAGE_TESTIDS.filter((testId) => screen.queryByTestId(testId)).length;
}

beforeEach(() => {
  mockUseAppReady.mockReturnValue(true);
});

describe("라우터 배선 + 온보딩 가드 + 부트스트랩 게이트 (packet 0019)", () => {
  describe("AC-1[P0]: 9 direct-entry routes each render their own page", () => {
    it("AC-1[P0]: renders the matching page stub for every defined route", () => {
      setFlags({ onboarded: true });

      const table: Array<[string, string]> = [
        ["/", "page-home"],
        ["/onboarding", "page-onboarding"],
        ["/capture", "page-capture"],
        ["/result", "page-result"],
        ["/search", "page-search"],
        ["/premium", "page-premium"],
        ["/report", "page-report"],
        ["/settings", "page-settings"],
        ["/settings/goal", "page-goal-edit"],
      ];

      for (const [routePath, testId] of table) {
        const { unmount } = renderAt(routePath);
        expect(screen.getByTestId(testId)).toBeInTheDocument();
        expect(renderedPageCount()).toBe(1);
        unmount();
      }
    });

    it("AC-1[P0]: /settings/goal renders GoalEdit, not the parent /settings page", () => {
      setFlags({ onboarded: true });

      renderAt("/settings/goal");

      expect(screen.getByTestId("page-goal-edit")).toBeInTheDocument();
      expect(screen.queryByTestId("page-settings")).not.toBeInTheDocument();
    });
  });

  describe("AC-2[P0]: bootstrap gate — useAppReady()", () => {
    it("AC-2[P0]: renders only a TDS Skeleton while useAppReady() is false", () => {
      mockUseAppReady.mockReturnValue(false);
      setFlags({ onboarded: true });

      const { container } = renderAt("/");

      expect(container.querySelectorAll('[data-skeleton="true"]').length).toBeGreaterThan(0);
      expect(renderedPageCount()).toBe(0);
    });

    it("AC-2[P0]: renders the routed page (no skeleton) once useAppReady() is true", () => {
      mockUseAppReady.mockReturnValue(true);
      setFlags({ onboarded: true });

      const { container } = renderAt("/");

      expect(screen.getByTestId("page-home")).toBeInTheDocument();
      expect(container.querySelectorAll('[data-skeleton="true"]').length).toBe(0);
    });
  });

  describe("AC-3[P0]: onboarding guard reacts to fct:flags.onboarded", () => {
    it("AC-3[P0]: onboarded=false redirects / to /onboarding (replace)", () => {
      setFlags({ onboarded: false });

      renderAt("/");

      expect(screen.getByTestId("page-onboarding")).toBeInTheDocument();
      expect(screen.queryByTestId("page-home")).not.toBeInTheDocument();
    });

    it("AC-3[P0]: onboarded=true does not redirect — home renders directly", () => {
      setFlags({ onboarded: true });

      renderAt("/");

      expect(screen.getByTestId("page-home")).toBeInTheDocument();
      expect(screen.queryByTestId("page-onboarding")).not.toBeInTheDocument();
    });
  });

  describe("AC-4[P1]: unknown route fallback", () => {
    it("AC-4[P1]: an undefined path redirects to / (home) with no blank screen", () => {
      setFlags({ onboarded: true });

      const { container } = renderAt("/this-route-does-not-exist");

      expect(screen.getByTestId("page-home")).toBeInTheDocument();
      expect(container.textContent?.length ?? 0).toBeGreaterThan(0);
    });
  });

  describe("AC-5[P0]: FloatingTabBar renders only on tab-root routes", () => {
    it("AC-5[P0]: exactly one tab is active, and it differs across /, /report, /settings", () => {
      setFlags({ onboarded: true });

      const roots = ["/", "/report", "/settings"];
      const activeLabels = new Set<string>();

      for (const routePath of roots) {
        const { unmount } = renderAt(routePath);
        const tabs = screen.getAllByRole("tab");
        expect(tabs).toHaveLength(3);

        const selected = tabs.filter((tab) => tab.getAttribute("aria-selected") === "true");
        expect(selected).toHaveLength(1);

        activeLabels.add(selected[0].getAttribute("aria-label") ?? selected[0].textContent ?? "");
        unmount();
      }

      expect(activeLabels.size).toBe(3);
    });

    it("AC-5[P0]: tab bar is absent on non-tab-root routes like /capture", () => {
      setFlags({ onboarded: true });

      renderAt("/capture");

      expect(screen.getByTestId("page-capture")).toBeInTheDocument();
      expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    });
  });

  describe("AC-6: main.tsx / build-safety guard", () => {
    it("AC-6: main.tsx keeps its @AI:ANCHOR marker untouched", () => {
      const mainSource = fs.readFileSync(path.resolve(process.cwd(), "src/main.tsx"), "utf-8");

      expect(mainSource).toContain("@AI:ANCHOR");
      expect(mainSource).toContain("TDSMobileAITProvider");
    });
  });
});
