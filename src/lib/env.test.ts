import { describe, expect, it } from "vitest";

import { shouldUseSecureCookies } from "@/lib/env";

describe("shouldUseSecureCookies", () => {
  it("allows direct HTTP deployments to set a session cookie", () => {
    expect(shouldUseSecureCookies("http://71.66.172.118:3005")).toBe(false);
  });

  it("uses secure cookies for HTTPS deployments", () => {
    expect(shouldUseSecureCookies("https://portal.example.com")).toBe(true);
  });
});
