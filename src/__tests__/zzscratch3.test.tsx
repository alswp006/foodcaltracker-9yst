import { describe, it, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

function Gate({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  if (location.pathname !== "/onboarding") {
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

describe("zzscratch3", () => {
  it("minimal redirect works with useNavigate mocked", () => {
    render(
      React.createElement(MemoryRouter, { initialEntries: ["/"] }, React.createElement(App)),
    );
    screen.debug(undefined, 20000);
  });
});
