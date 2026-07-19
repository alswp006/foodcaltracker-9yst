import { describe, it } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";

function Probe() {
  const loc = useLocation();
  return React.createElement("div", { "data-testid": "probe" }, loc.pathname);
}

describe("zzscratch7", () => {
  it("bare useLocation across multiple renders", () => {
    for (const p of ["/", "/report", "/settings"]) {
      const { unmount } = render(
        React.createElement(MemoryRouter, { initialEntries: [p] }, React.createElement(Probe)),
      );
      console.log("probe for", p, "->", screen.getByTestId("probe").textContent);
      unmount();
    }
  });
});
