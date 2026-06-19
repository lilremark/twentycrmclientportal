import nodemailer from "nodemailer";

export type SmtpTransportSettings = {
  host: string;
  port: number;
  secure: boolean;
  user?: string | null;
  password?: string | null;
};

export function createSmtpTransport(settings: SmtpTransportSettings) {
  validateSmtpEncryptionMode(settings);

  return nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
    auth:
      settings.user && settings.password
        ? { user: settings.user, pass: settings.password }
        : undefined,
  });
}

export function validateSmtpEncryptionMode({
  port,
  secure,
}: Pick<SmtpTransportSettings, "port" | "secure">) {
  if (secure && port !== 465) {
    throw new Error(
      `Port ${port} does not use implicit TLS. Select STARTTLS / standard SMTP for port ${port}; use implicit TLS only with port 465.`,
    );
  }

  if (!secure && port === 465) {
    throw new Error(
      "Port 465 requires implicit TLS. Select implicit TLS or use port 587 with STARTTLS.",
    );
  }
}

export function formatSmtpError(error: unknown) {
  const message =
    error instanceof Error ? error.message : "SMTP connection failed.";

  if (
    /wrong version number|wrong version|tls_validate_record_header/i.test(
      message,
    )
  ) {
    return "SMTP encryption mode does not match the server port. Use STARTTLS / standard SMTP for port 587 or 25, and implicit TLS only for port 465.";
  }

  return message;
}
