import { describe, expect, it } from "vitest";

import {
  hashPortalPassword,
  verifyPortalPassword,
} from "@/lib/password";

describe("portal password hashing", () => {
  it("round-trips the configured password", async () => {
    const hash = await hashPortalPassword("Strong-Admin-Password-123");
    await expect(
      verifyPortalPassword({
        hash,
        password: "Strong-Admin-Password-123",
      }),
    ).resolves.toBe(true);
    await expect(
      verifyPortalPassword({ hash, password: "wrong-password" }),
    ).resolves.toBe(false);
  });
});
