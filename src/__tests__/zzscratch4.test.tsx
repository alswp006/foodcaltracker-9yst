import { describe, it, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { safeGet } from "@/lib/storage";
import { STORAGE_KEYS, DEFAULT_FLAGS } from "@/lib/types";
import type { AppFlags } from "@/lib/types";
import { seedLocalStorage } from "@/__tests__/__helpers__/test-utils";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

function Gate({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const flags = safeGet<AppFlags>(STORAGE_KEYS.flags, DEFAULT_FLAGS);
  const exempt = location.pathname === "/onboarding";
  console.log("ZZ4 Gate render pathname=", location.pathname, "onboarded=", flags.onboarded);
  if (!flags.onboarded && !exempt) {
    return <Navigate to="/onboarding" replace />;
  }
  return <>{children}</>;
}

function App() {
  return (
    <Gate>
      <Routes>
        <Route path="/" element={<div data-testid="page-home">Home</div>} />
        <Route path="/onboarding" element={<div data-testid="page-onboarding">Onboarding</div>} />
      </Routes>
    </Gate>
  );
}

describe("zzscratch4", () => {
  it("with safeGet flags", () => {
    seedLocalStorage({
      [STORAGE_KEYS.flags]: { ...DEFAULT_FLAGS, onboarded: false },
    });
    render(
      React.createElement(MemoryRouter, { initialEntries: ["/"] }, React.createElement(App)),
    );
    screen.debug(undefined, 20000);
  });
});
