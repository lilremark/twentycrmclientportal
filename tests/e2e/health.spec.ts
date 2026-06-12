import { expect, test } from "@playwright/test";

test("liveness endpoint responds", async ({ request }) => {
  const response = await request.get("/health/live");
  expect(response.ok()).toBe(true);
  await expect(response.json()).resolves.toEqual({ status: "ok" });
});
