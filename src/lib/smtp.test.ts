import { describe, expect, it } from "vitest";

import {
  formatSmtpError,
  validateSmtpEncryptionMode,
} from "@/lib/smtp";

describe("SMTP encryption modes", () => {
  it("accepts STARTTLS on port 587", () => {
    expect(() =>
      validateSmtpEncryptionMode({ port: 587, secure: false }),
    ).not.toThrow();
  });

  it("accepts implicit TLS on port 465", () => {
    expect(() =>
      validateSmtpEncryptionMode({ port: 465, secure: true }),
    ).not.toThrow();
  });

  it("rejects implicit TLS on a STARTTLS port", () => {
    expect(() =>
      validateSmtpEncryptionMode({ port: 587, secure: true }),
    ).toThrow(/STARTTLS/);
  });

  it("rejects standard SMTP on the implicit TLS port", () => {
    expect(() =>
      validateSmtpEncryptionMode({ port: 465, secure: false }),
    ).toThrow(/implicit TLS/);
  });

  it("replaces OpenSSL record errors with actionable guidance", () => {
    expect(
      formatSmtpError(
        new Error(
          "SSL routines:tls_validate_record_header:wrong version number",
        ),
      ),
    ).toContain("port 587 or 25");
  });
});
