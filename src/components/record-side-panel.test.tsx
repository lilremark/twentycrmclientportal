// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RecordSidePanel } from "@/components/record-side-panel";

const push = vi.fn();
const storage = new Map<string, string>();
const localStorageMock = {
  clear: () => storage.clear(),
  getItem: (key: string) => storage.get(key) ?? null,
  key: (index: number) => Array.from(storage.keys())[index] ?? null,
  get length() {
    return storage.size;
  },
  removeItem: (key: string) => storage.delete(key),
  setItem: (key: string, value: string) => storage.set(key, value),
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

beforeEach(() => {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: 1400,
  });
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: localStorageMock,
  });
  window.localStorage.clear();
  push.mockReset();
});

afterEach(cleanup);

describe("RecordSidePanel", () => {
  it("resizes with the keyboard and persists the selected width", () => {
    render(
      <RecordSidePanel closeHref="/portal" title="Record details">
        <p>Details</p>
      </RecordSidePanel>,
    );

    const resizeHandle = screen.getByRole("separator", {
      name: "Resize record details",
    });
    fireEvent.keyDown(resizeHandle, { key: "ArrowLeft" });

    expect(screen.getByRole("dialog")).toHaveStyle({
      "--record-panel-width": "576px",
    });
    expect(window.localStorage.getItem("record-panel-width")).toBe("576");
  });

  it("caps the panel at half of the viewport", () => {
    render(
      <RecordSidePanel closeHref="/portal" title="Record details">
        <p>Details</p>
      </RecordSidePanel>,
    );

    const resizeHandle = screen.getByRole("separator", {
      name: "Resize record details",
    });
    fireEvent.keyDown(resizeHandle, { key: "End" });

    expect(screen.getByRole("dialog")).toHaveStyle({
      "--record-panel-width": "700px",
    });
  });
});
