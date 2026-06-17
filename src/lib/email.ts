import "server-only";

import nodemailer from "nodemailer";

import { getSmtpIntegrationSettings } from "@/lib/integration-settings";

type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export async function sendEmail(message: EmailMessage) {
  const settings = await getSmtpIntegrationSettings();

  if (!settings) {
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
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
    auth:
      settings.user && settings.password
        ? { user: settings.user, pass: settings.password }
        : undefined,
  });

  await transporter.sendMail({
    from: settings.from,
    ...message,
  });

  return true;
}
