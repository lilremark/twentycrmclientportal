import { getApplicationSettings } from "@/lib/application-settings";
import { readUploadedFile } from "@/lib/uploads";

export const dynamic = "force-dynamic";

const localUploadPattern = /^\/api\/uploads\/([A-Za-z0-9._-]+)$/;

export async function GET(request: Request) {
  const settings = await getApplicationSettings();
  const localUpload = settings.brandLogoUrl?.match(localUploadPattern);

  if (localUpload?.[1]) {
    const file = await readUploadedFile(localUpload[1]);
    if (file) {
      return new Response(file.bytes, {
        headers: {
          "cache-control": "no-store",
          "content-security-policy":
            file.contentType === "image/svg+xml"
              ? "default-src 'none'; style-src 'unsafe-inline'; sandbox"
              : "default-src 'none'; sandbox",
          "content-type": file.contentType,
          "x-content-type-options": "nosniff",
        },
      });
    }
  }

  if (settings.brandLogoUrl) {
    try {
      const location = new URL(settings.brandLogoUrl, request.url);
      if (location.protocol === "http:" || location.protocol === "https:") {
        return new Response(null, {
          status: 307,
          headers: {
            "cache-control": "no-store",
            location: location.toString(),
          },
        });
      }
    } catch {
      // Fall back to the generated brand initials for invalid legacy values.
    }
  }

  const initials =
    settings.brandName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase() || "TP";
  const safeInitials = initials.replace(/[<>&"']/g, "");
  const safeColor = /^#[0-9a-fA-F]{6}$/.test(settings.primaryColor)
    ? settings.primaryColor
    : "#3157d5";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="${safeColor}"/><text x="32" y="39" fill="white" font-family="Arial,sans-serif" font-size="23" font-weight="700" text-anchor="middle">${safeInitials}</text></svg>`;

  return new Response(svg, {
    headers: {
      "cache-control": "no-store",
      "content-security-policy": "default-src 'none'; sandbox",
      "content-type": "image/svg+xml; charset=utf-8",
      "x-content-type-options": "nosniff",
    },
  });
}
