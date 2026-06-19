import { describe, expect, it } from "vitest";

import { compareVersions, latestVersionTag } from "@/lib/version";

describe("software versions", () => {
  it("sorts semantic Docker image tags", () => {
    expect(latestVersionTag(["latest", "1.0.2", "1.2.0", "1.10.0"])).toBe(
      "1.10.0",
    );
  });

  it("detects when a newer version is available", () => {
    expect(compareVersions("1.0.2", "1.1.0")).toBeLessThan(0);
    expect(compareVersions("1.1.0", "1.1.0")).toBe(0);
  });
});
