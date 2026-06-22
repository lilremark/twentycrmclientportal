import { NextResponse } from "next/server";

import { requireSession } from "@/lib/access";
import { getTwentyIntegrationSettings } from "@/lib/integration-settings";

const safeInlineContentTypes = new Set([
  "application/pdf",
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
]);

function contentDisposition(filename: string | null, download: boolean) {
  const safe = filename?.replace(/["\r\n]/g, "") || "twenty-file";
  return `${download ? "attachment" : "inline"}; filename="${safe}"`;
}

export async function GET(request: Request) {
  await requireSession();
  const settings = await getTwentyIntegrationSettings();
  const requestUrl = new URL(request.url);
  const rawUrl = requestUrl.searchParams.get("url");
  const rawPath = requestUrl.searchParams.get("path");
  const download = requestUrl.searchParams.get("download") === "1";
  if (!rawUrl && !rawPath) {
    return NextResponse.json({ error: "Missing file path" }, { status: 400 });
  }

  const base = new URL(settings.baseUrl);
  let target: URL;
  try {
    target = rawUrl ? new URL(rawUrl) : new URL(rawPath ?? "", base);
  } catch {
    return NextResponse.json({ error: "Invalid file URL" }, { status: 400 });
  }
  if (!["http:", "https:"].includes(target.protocol)) {
    return NextResponse.json(
      { error: "File protocol is not allowed" },
      { status: 403 },
    );
  }
  if (target.origin !== base.origin) {
    return NextResponse.json({ error: "File origin is not allowed" }, { status: 403 });
  }

  const response = await fetch(target, {
    headers: { authorization: `Bearer ${settings.apiKey}` },
    cache: "no-store",
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    return NextResponse.json(
      { error: "File could not be loaded" },
      { status: response.status },
    );
  }

  const contentType = (
    response.headers.get("content-type") ?? "application/octet-stream"
  )
    .split(";")[0]
    ?.trim()
    .toLowerCase();
  const forceDownload = download || !safeInlineContentTypes.has(contentType);
  const filename = target.pathname.split("/").filter(Boolean).at(-1) ?? null;
  return new Response(response.body, {
    headers: {
      "cache-control": "private, no-store",
      "content-disposition": contentDisposition(filename, forceDownload),
      "content-security-policy": "default-src 'none'; sandbox",
      "content-type": contentType,
      "x-content-type-options": "nosniff",
    },
  });
}
