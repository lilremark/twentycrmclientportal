import "server-only";

import nodemailer from "nodemailer";

import { getEnv } from "@/lib/env";

type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export async function sendEmail(message: EmailMessage) {
  const env = getEnv();

  if (!env.SMTP_HOST) {
    console.info(
      JSON.stringify({
        level: "info",
        event: "email_skipped",
        to: message.to,
        subject: message.subject,
      }),
    );
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth:
      env.SMTP_USER && env.SMTP_PASSWORD
        ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }
        : undefined,
  });

  await transporter.sendMail({
    from: env.SMTP_FROM,
    ...message,
  });

  return true;
}
