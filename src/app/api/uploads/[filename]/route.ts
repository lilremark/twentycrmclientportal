import { notFound } from "next/navigation";

import { readUploadedFile } from "@/lib/uploads";

export async function GET(
  _request: Request,
  context: { params: Promise<{ filename: string }> },
) {
  const { filename } = await context.params;
  const file = await readUploadedFile(filename);
  if (!file) notFound();

  return new Response(file.bytes, {
    headers: {
      "cache-control": "public, max-age=31536000, immutable",
      "content-security-policy":
        file.contentType === "image/svg+xml"
          ? "default-src 'none'; style-src 'unsafe-inline'; sandbox"
          : "default-src 'none'; sandbox",
      "content-type": file.contentType,
      "x-content-type-options": "nosniff",
    },
  });
}
