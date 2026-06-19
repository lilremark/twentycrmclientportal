export const DEFAULT_INVITATION_EMAIL_SUBJECT =
  "You are invited to {{brand_name}}";

export const INVITATION_EMAIL_PLACEHOLDERS = [
  "{{invite_url}}",
  "{{recipient_name}}",
  "{{recipient_email}}",
  "{{brand_name}}",
  "{{portal_title}}",
  "{{support_email}}",
] as const;

type InvitationBranding = {
  brandName: string;
  brandLogoUrl: string | null;
  primaryColor: string;
  portalTitle: string;
  portalDescription: string;
  supportEmail: string | null;
};

type InvitationRecipient = {
  name: string;
  email: string;
  inviteUrl: string;
};

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character] ?? character,
  );
}

function toAbsoluteUrl(reference: string | null, appUrl: string) {
  if (!reference) return null;
  try {
    return new URL(reference, appUrl).toString();
  } catch {
    return null;
  }
}

function replacePlaceholders(
  template: string,
  values: Record<(typeof INVITATION_EMAIL_PLACEHOLDERS)[number], string>,
) {
  return Object.entries(values).reduce(
    (result, [placeholder, value]) =>
      result.replaceAll(placeholder, value),
    template,
  );
}

export function getDefaultInvitationEmailHtml(
  settings: InvitationBranding,
  appUrl: string,
) {
  const logoUrl = toAbsoluteUrl(settings.brandLogoUrl, appUrl);
  const brandIdentity = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="{{brand_name}}" width="42" height="42" style="display:block;width:42px;height:42px;object-fit:contain;border:0;border-radius:10px;">`
    : `<div style="width:42px;height:42px;line-height:42px;text-align:center;border-radius:10px;background:{{primary_color}};color:#ffffff;font-size:14px;font-weight:700;">${escapeHtml(settings.brandName.slice(0, 2).toUpperCase())}</div>`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{portal_title}}</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f6f8;color:#172033;font-family:Inter,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f4f6f8;">
      <tr>
        <td align="center" style="padding:40px 18px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:620px;">
            <tr>
              <td style="padding:0 4px 18px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="vertical-align:middle;">${brandIdentity}</td>
                    <td style="padding-left:12px;vertical-align:middle;">
                      <div style="font-size:16px;font-weight:700;color:#172033;">{{brand_name}}</div>
                      <div style="margin-top:2px;font-size:12px;color:#6b7280;">{{portal_title}}</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="border:1px solid #dfe4ea;border-radius:16px;background:#ffffff;padding:36px;">
                <div style="font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:{{primary_color}};">Portal invitation</div>
                <h1 style="margin:12px 0 12px;font-size:26px;line-height:1.25;color:#172033;">Your client portal is ready</h1>
                <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#4b5563;">Hello {{recipient_name}},</p>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#4b5563;">You have been invited to securely access {{portal_title}}. Use the button below to create your account and accept the invitation.</p>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="border-radius:9px;background:{{primary_color}};">
                      <a href="{{invite_url}}" style="display:inline-block;padding:13px 20px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">Accept invitation</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:26px 0 0;font-size:12px;line-height:1.6;color:#7a8494;">This invitation expires in 7 days. If the button does not work, copy this link into your browser:</p>
                <p style="margin:8px 0 0;font-size:12px;line-height:1.6;word-break:break-all;color:#4b5563;">{{invite_url}}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 4px 0;font-size:12px;line-height:1.6;color:#7a8494;">
                This invitation was sent to {{recipient_email}}.${settings.supportEmail ? " Need help? Contact {{support_email}}." : ""}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function getInvitationEmailEditorValues(
  settings: InvitationBranding & {
    invitationEmailSubject: string | null;
    invitationEmailHtml: string | null;
  },
  appUrl: string,
) {
  return {
    subject:
      settings.invitationEmailSubject ?? DEFAULT_INVITATION_EMAIL_SUBJECT,
    html:
      settings.invitationEmailHtml ??
      getDefaultInvitationEmailHtml(settings, appUrl),
    isCustomized: Boolean(
      settings.invitationEmailSubject || settings.invitationEmailHtml,
    ),
  };
}

export function renderInvitationEmail(
  settings: InvitationBranding & {
    invitationEmailSubject: string | null;
    invitationEmailHtml: string | null;
  },
  recipient: InvitationRecipient,
  appUrl: string,
) {
  const subjectTemplate =
    settings.invitationEmailSubject ?? DEFAULT_INVITATION_EMAIL_SUBJECT;
  const htmlTemplate =
    settings.invitationEmailHtml ??
    getDefaultInvitationEmailHtml(settings, appUrl);
  const plainValues = {
    "{{invite_url}}": recipient.inviteUrl,
    "{{recipient_name}}": recipient.name,
    "{{recipient_email}}": recipient.email,
    "{{brand_name}}": settings.brandName,
    "{{portal_title}}": settings.portalTitle,
    "{{support_email}}": settings.supportEmail ?? "",
  } satisfies Record<
    (typeof INVITATION_EMAIL_PLACEHOLDERS)[number],
    string
  >;
  const htmlValues = Object.fromEntries(
    Object.entries(plainValues).map(([key, value]) => [key, escapeHtml(value)]),
  ) as typeof plainValues;
  const htmlValuesWithColor = {
    ...htmlValues,
    "{{primary_color}}": settings.primaryColor,
  };

  return {
    subject: replacePlaceholders(subjectTemplate, plainValues)
      .replace(/[\r\n]+/g, " ")
      .trim(),
    html: Object.entries(htmlValuesWithColor).reduce(
      (result, [placeholder, value]) =>
        result.replaceAll(placeholder, value),
      htmlTemplate,
    ),
    text: [
      `Hello ${recipient.name},`,
      "",
      `You have been invited to ${settings.portalTitle}.`,
      `Accept your invitation: ${recipient.inviteUrl}`,
      "",
      "This invitation expires in 7 days.",
      settings.supportEmail
        ? `Need help? Contact ${settings.supportEmail}.`
        : "",
    ]
      .filter((line, index, lines) => line || lines[index - 1])
      .join("\n")
      .trim(),
  };
}
