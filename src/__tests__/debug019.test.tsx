import { describe, it } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockAppsInToss } from "@/__tests__/__helpers__/mocks";
import { FloatingTabBar } from "@/components/FloatingTabBar";

mockAppsInToss();

function renderAt(p: string) {
  return render(
    React.createElement(
      MemoryRouter,
      { initialEntries: [p] },
      React.createElement(FloatingTabBar, {
        items: [
          { label: "홈", path: "/" },
          { label: "리포트", path: "/report" },
          { label: "설정", path: "/settings" },
        ],
      }),
    ),
  );
}

describe("debug12", () => {
  it("three renders + screen.getAllByRole tab queries", () => {
    for (const p of ["/", "/report", "/settings"]) {
      const { unmount } = renderAt(p);
      const tabs = screen.getAllByRole("tab");
      const active = tabs.filter((t) => t.getAttribute("aria-selected") === "true");
      console.log(
        "for",
        p,
        "-> active:",
        active.map((a) => a.getAttribute("aria-label")),
      );
      unmount();
    }
  });
});
