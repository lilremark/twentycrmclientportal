import { NextResponse } from "next/server";

import { requireSession } from "@/lib/access";
import { getTwentyIntegrationSettings } from "@/lib/integration-settings";

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
  const target = rawUrl ? new URL(rawUrl) : new URL(rawPath ?? "", base);
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

  const contentType =
    response.headers.get("content-type") ?? "application/octet-stream";
  const filename = target.pathname.split("/").filter(Boolean).at(-1) ?? null;
  return new Response(response.body, {
    headers: {
      "cache-control": "private, no-store",
      "content-disposition": contentDisposition(filename, download),
      "content-type": contentType,
    },
  });
}
