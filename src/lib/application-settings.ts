import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { applicationSettings } from "@/lib/db/schema";
import { getBranding } from "@/lib/env";

export const APPLICATION_SETTINGS_ID = "default";

export type ApplicationSettings = {
  brandName: string;
  brandLogoUrl: string | null;
  loginBackgroundUrl: string | null;
  primaryColor: string;
  portalTitle: string;
  portalDescription: string;
  supportEmail: string | null;
};

export function getDefaultApplicationSettings(): ApplicationSettings {
  const branding = getBranding();
  return {
    brandName: branding.name,
    brandLogoUrl: branding.logoUrl,
    loginBackgroundUrl: null,
    primaryColor: branding.primaryColor,
    portalTitle: "Client portal",
    portalDescription: "Secure access to the records shared with your team.",
    supportEmail: null,
  };
}

export async function getApplicationSettings(): Promise<ApplicationSettings> {
  const current = await db.query.applicationSettings.findFirst({
    where: eq(applicationSettings.id, APPLICATION_SETTINGS_ID),
  });

  if (!current) {
    return getDefaultApplicationSettings();
  }

  return {
    brandName: current.brandName,
    brandLogoUrl: current.brandLogoUrl,
    loginBackgroundUrl: current.loginBackgroundUrl,
    primaryColor: current.primaryColor,
    portalTitle: current.portalTitle,
    portalDescription: current.portalDescription,
    supportEmail: current.supportEmail,
  };
}

export function getSettingsBranding(settings: ApplicationSettings) {
  return {
    name: settings.brandName,
    logoUrl: settings.brandLogoUrl,
    primaryColor: settings.primaryColor,
    loginBackgroundUrl: settings.loginBackgroundUrl,
  };
}
