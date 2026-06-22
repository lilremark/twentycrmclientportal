import { describe, expect, it } from "vitest";

import { isHttpUrl } from "@/lib/url-security";

describe("isHttpUrl", () => {
  it.each([
    ["https://portal.example.com/image.png", true],
    ["http://localhost:3000/image.png", true],
    ["javascript:alert(1)", false],
    ["data:image/svg+xml,<svg/>", false],
    ["not a URL", false],
  ])("validates %s", (value, expected) => {
    expect(isHttpUrl(value)).toBe(expected);
  });
});
