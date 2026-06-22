import "server-only";

import { mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { randomUUID } from "node:crypto";

const uploadRoot = join(process.cwd(), "data", "uploads");
const publicUploadBase = "/api/uploads";
const localUploadPattern = /^\/api\/uploads\/([A-Za-z0-9._-]+)$/;

const imageTypes = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
]);

export async function saveUploadedImage(file: File | null | undefined) {
  if (!file || file.size === 0) return null;
  const extension = imageTypes.get(file.type);
  if (!extension) {
    throw new Error("Upload a JPG, PNG, WEBP, or GIF image.");
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

export async function saveUploadedPngBackground(
  file: File | null | undefined,
) {
  if (!file || file.size === 0) return null;
  if (file.size > 8_000_000) {
    throw new Error("Sign-in background images must be smaller than 8 MB.");
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const isPng =
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a;
  if (!isPng) {
    throw new Error("Upload a valid PNG background image.");
  }

  await mkdir(uploadRoot, { recursive: true });
  const filename = `${randomUUID()}.png`;
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

export function isLocalUploadReference(
  value: string | null | undefined,
): value is string {
  return Boolean(value && localUploadPattern.test(value));
}

export async function deleteUploadedFile(
  reference: string | null | undefined,
) {
  const match = reference?.match(localUploadPattern);
  if (!match) return false;
  const filename = match[1];
  if (!filename) return false;

  const path = join(uploadRoot, filename);
  await unlink(path).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") throw error;
  });
  return true;
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
