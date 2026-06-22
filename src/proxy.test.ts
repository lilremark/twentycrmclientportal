import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { proxy } from "@/proxy";

describe("security headers", () => {
  it("sandboxes uploaded and proxied content", () => {
    for (const path of [
      "/api/brand-icon",
      "/api/uploads/logo.svg",
      "/api/twenty/files?path=/file/example",
    ]) {
      const response = proxy(
        new NextRequest(`https://portal.example.com${path}`),
      );
      expect(response.headers.get("content-security-policy")).toBe(
        "default-src 'none'; sandbox",
      );
    }
  });

  it("does not allow eval in the production application policy", () => {
    const previousNodeEnv = process.env.NODE_ENV;
    Object.assign(process.env, { NODE_ENV: "production" });
    try {
      const response = proxy(
        new NextRequest("https://portal.example.com/login"),
      );
      expect(response.headers.get("content-security-policy")).not.toContain(
        "'unsafe-eval'",
      );
    } finally {
      Object.assign(process.env, { NODE_ENV: previousNodeEnv });
    }
  });
});
