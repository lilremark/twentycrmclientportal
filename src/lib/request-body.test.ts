import { describe, expect, it } from "vitest";

import {
  readRequestText,
  RequestBodyTooLargeError,
} from "@/lib/request-body";

describe("readRequestText", () => {
  it("reads a request body within the configured limit", async () => {
    const request = new Request("https://portal.example.com/webhook", {
      method: "POST",
      body: "hello",
    });

    await expect(readRequestText(request, 5)).resolves.toBe("hello");
  });

  it("rejects a declared body that exceeds the configured limit", async () => {
    const request = new Request("https://portal.example.com/webhook", {
      method: "POST",
      body: "hello",
      headers: { "content-length": "6" },
    });

    await expect(readRequestText(request, 5)).rejects.toBeInstanceOf(
      RequestBodyTooLargeError,
    );
  });

  it("rejects a streamed body that exceeds the configured limit", async () => {
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("hello!"));
        controller.close();
      },
    });
    const request = new Request("https://portal.example.com/webhook", {
      method: "POST",
      body,
      duplex: "half",
    } as RequestInit);

    await expect(readRequestText(request, 5)).rejects.toBeInstanceOf(
      RequestBodyTooLargeError,
    );
  });
});
