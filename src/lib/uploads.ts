import "server-only";

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { randomUUID } from "node:crypto";

const uploadRoot = join(process.cwd(), "data", "uploads");
const publicUploadBase = "/api/uploads";

const imageTypes = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
  ["image/svg+xml", ".svg"],
]);

export async function saveUploadedImage(file: File | null | undefined) {
  if (!file || file.size === 0) return null;
  const extension = imageTypes.get(file.type);
  if (!extension) {
    throw new Error("Upload a JPG, PNG, WEBP, GIF, or SVG image.");
  }
  if (file.size > 2_000_000) {
    throw new Error("Images must be smaller than 2 MB.");
  }

  await mkdir(uploadRoot, { recursive: true });
  const filename = `${randomUUID()}${extension}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(join(uploadRoot, filename), bytes);
  return `${publicUploadBase}/${filename}`;
}

export async function readUploadedFile(filename: string) {
  const safeName = normalize(filename).replace(/^(\.\.(\/|\\|$))+/, "");
  if (safeName.includes("/") || safeName.includes("\\")) {
    return null;
  }
  const path = join(uploadRoot, safeName);
  const details = await stat(path).catch(() => null);
  if (!details?.isFile()) return null;
  return {
    bytes: await readFile(path),
    contentType: contentTypeForPath(path),
  };
}

function contentTypeForPath(path: string) {
  switch (extname(path).toLowerCase()) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}
