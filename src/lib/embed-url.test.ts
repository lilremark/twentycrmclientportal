import { describe, expect, it } from "vitest";

import { normalizeSecureEmbedUrl } from "@/lib/embed-url";

describe("normalizeSecureEmbedUrl", () => {
  it("accepts public HTTPS embeds", () => {
    expect(normalizeSecureEmbedUrl("https://reports.example.com/embed/42"))
      .toBe("https://reports.example.com/embed/42");
  });

  it.each([
    "http://reports.example.com/embed/42",
    "https://localhost/embed",
    "https://127.0.0.1/embed",
    "https://192.168.1.10/embed",
    "https://[::ffff:127.0.0.1]/embed",
    "https://user:secret@example.com/embed",
  ])("rejects unsafe embed target %s", (url) => {
    expect(() => normalizeSecureEmbedUrl(url)).toThrow();
  });
});
