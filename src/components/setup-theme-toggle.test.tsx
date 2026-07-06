// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { SetupThemeToggle } from "@/components/setup-theme-toggle";

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

describe("SetupThemeToggle", () => {
  beforeEach(() => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: localStorageMock,
    });
    window.localStorage.clear();
    document.documentElement.classList.add("dark");
    document.documentElement.dataset.theme = "dark";
  });

  afterEach(() => {
    cleanup();
    document.documentElement.classList.remove("dark");
    delete document.documentElement.dataset.theme;
    document.documentElement.style.colorScheme = "";
  });

  it("defaults the setup experience to light mode", () => {
    render(<SetupThemeToggle />);

    expect(document.documentElement).not.toHaveClass("dark");
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(
      screen.getByRole("button", { name: "Switch setup to dark mode" }),
    ).toBeVisible();
  });

  it("persists an explicit setup theme choice", () => {
    render(<SetupThemeToggle />);

    fireEvent.click(
      screen.getByRole("button", { name: "Switch setup to dark mode" }),
    );

    expect(document.documentElement).toHaveClass("dark");
    expect(localStorage.getItem("setup-theme")).toBe("dark");
    expect(
      screen.getByRole("button", { name: "Switch setup to light mode" }),
    ).toBeVisible();
  });
});
