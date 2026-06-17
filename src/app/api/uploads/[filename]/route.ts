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
      "content-type": file.contentType,
    },
  });
}
