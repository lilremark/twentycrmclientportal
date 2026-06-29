import { describe, expect, it } from "vitest";

import {
  getDefaultInvitationEmailHtml,
  renderInvitationEmail,
} from "@/lib/invitation-email";

const settings = {
  brandName: "Acme <Portal>",
  brandLogoUrl: "/api/uploads/logo.png",
  primaryColor: "#3157d5",
  iconColor: "#3157d5",
  portalTitle: "Client workspace",
  portalDescription: "Shared records",
  supportEmail: "support@example.com",
  invitationEmailSubject: null,
  invitationEmailHtml: null,
};

describe("invitation email templates", () => {
  it("builds a branded default template with an absolute logo URL", () => {
    const html = getDefaultInvitationEmailHtml(
      settings,
      "https://portal.example.com",
    );

    expect(html).toContain(
      'src="https://portal.example.com/api/uploads/logo.png"',
    );
    expect(html).toContain("{{invite_url}}");
  });

  it("escapes placeholder values in custom HTML", () => {
    const email = renderInvitationEmail(
      {
        ...settings,
        invitationEmailSubject: "Invite for {{recipient_name}}",
        invitationEmailHtml:
          '<a href="{{invite_url}}">{{recipient_name}} — {{brand_name}}</a>',
      },
      {
        name: 'Jane <script>alert("x")</script>',
        email: "jane@example.com",
        inviteUrl: "https://portal.example.com/invite/token?a=1&b=2",
      },
      "https://portal.example.com",
    );

    expect(email.subject).not.toContain("\n");
    expect(email.html).toContain("Jane &lt;script&gt;");
    expect(email.html).toContain("a=1&amp;b=2");
    expect(email.html).toContain("Acme &lt;Portal&gt;");
  });
});
