import { describe, it, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockTds, mockAppsInToss } from "@/__tests__/__helpers__/mocks";
import { seedLocalStorage } from "@/__tests__/__helpers__/test-utils";
import { STORAGE_KEYS, DEFAULT_FLAGS } from "@/lib/types";

mockTds();
mockAppsInToss();

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("@/lib/hooks", async () => {
  const actual = await vi.importActual<typeof import("@/lib/hooks")>("@/lib/hooks");
  return { ...actual, useAppReady: () => true };
});

vi.mock("@/pages/Home", () => ({
  default: () => React.createElement("div", { "data-testid": "page-home" }, "Home"),
}));
vi.mock("@/pages/Onboarding", () => ({
  default: () => React.createElement("div", { "data-testid": "page-onboarding" }, "Onboarding"),
}));

import App from "@/App";

describe("zzscratch", () => {
  it("debug redirect", () => {
    seedLocalStorage({
      [STORAGE_KEYS.flags]: { ...DEFAULT_FLAGS, onboarded: false },
    });

    render(
      React.createElement(MemoryRouter, { initialEntries: ["/"] }, React.createElement(App)),
    );

    screen.debug(undefined, 20000);
  });
});
