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
          "content-type": file.contentType,
        },
      });
    }
  }

  if (settings.brandLogoUrl) {
    const location = new URL(settings.brandLogoUrl, request.url);
    return new Response(null, {
      status: 307,
      headers: {
        "cache-control": "no-store",
        location: location.toString(),
      },
    });
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
      "content-type": "image/svg+xml; charset=utf-8",
    },
  });
}
