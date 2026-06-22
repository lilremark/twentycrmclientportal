import "server-only";

import { getSmtpIntegrationSettings } from "@/lib/integration-settings";
import { createSmtpTransport } from "@/lib/smtp";

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

  const transporter = createSmtpTransport(settings);

  try {
    await transporter.sendMail({
      from: settings.from,
      disableFileAccess: true,
      disableUrlAccess: true,
      ...message,
    });
  } finally {
    transporter.close();
  }

  return true;
}
