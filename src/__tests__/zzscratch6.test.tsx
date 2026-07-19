import { describe, it, vi } from "vitest";
import React, { lazy, Suspense } from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { mockTds, mockAppsInToss } from "@/__tests__/__helpers__/mocks";
import { safeGet } from "@/lib/storage";
import { STORAGE_KEYS, DEFAULT_FLAGS } from "@/lib/types";
import type { AppFlags } from "@/lib/types";
import { seedLocalStorage } from "@/__tests__/__helpers__/test-utils";
import { PageShell } from "@/components/PageShell";
import { FloatingTabBar } from "@/components/FloatingTabBar";
import { useAppReady } from "@/lib/hooks";
import Capture from "@/pages/Capture";
import Result from "@/pages/Result";
import Search from "@/pages/Search";
import Premium from "@/pages/Premium";
import Report from "@/pages/Report";
import Settings from "@/pages/Settings";
import GoalEdit from "@/pages/GoalEdit";

mockTds();
mockAppsInToss();

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

function Gate({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const flags = safeGet<AppFlags>(STORAGE_KEYS.flags, DEFAULT_FLAGS);
  const exempt = location.pathname === "/onboarding";
  console.log("ZZ6 Gate render pathname=", location.pathname, "onboarded=", flags.onboarded);
  if (!flags.onboarded && !exempt) {
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
}

const TAB_ROOTS = ["/", "/report", "/settings"];

const DevTdsGallery = import.meta.env.DEV
  ? lazy(() => import("../pages/__TdsGallery"))
  : null;

function App() {
  const ready = useAppReady();
  const location = useLocation();
  const showTabBar = TAB_ROOTS.includes(location.pathname);
  console.log("ZZ6 App render pathname=", location.pathname, "ready=", ready);
  return (
    <Gate>
      <Routes>
        <Route path="/" element={<div data-testid="page-home">Home</div>} />
        <Route path="/onboarding" element={<div data-testid="page-onboarding">Onboarding</div>} />
        <Route path="/capture" element={<Capture />} />
        <Route path="/result" element={<Result />} />
        <Route path="/search" element={<Search />} />
        <Route path="/premium" element={<Premium />} />
        <Route path="/report" element={<Report />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/settings/goal" element={<GoalEdit />} />
        {DevTdsGallery && (
          <Route
            path="/__tds-gallery"
            element={
              <Suspense fallback={null}>
                <DevTdsGallery />
              </Suspense>
            }
          />
        )}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {showTabBar && (
        <FloatingTabBar items={[{ label: "홈", path: "/" }, { label: "리포트", path: "/report" }, { label: "설정", path: "/settings" }]} />
      )}
    </Gate>
  );
}

describe("zzscratch6", () => {
  it("with real FloatingTabBar/PageShell", () => {
    seedLocalStorage({
      [STORAGE_KEYS.flags]: { ...DEFAULT_FLAGS, onboarded: false },
    });
    render(
      React.createElement(MemoryRouter, { initialEntries: ["/"] }, React.createElement(App)),
    );
    screen.debug(undefined, 20000);
  });
});
