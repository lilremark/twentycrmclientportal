const privateIpv4 = /^(?:10\.|127\.|169\.254\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.|100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|0\.)/;

export function normalizeSecureEmbedUrl(value: string) {
  if (!value || value.length > 2048) throw new Error("Add a valid HTTPS embed URL.");
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("Add a valid HTTPS embed URL."); }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    privateIpv4.test(host) ||
    host === "::" ||
    host === "::1" ||
    host.startsWith("::ffff:") ||
    (host.includes(":") && (host.startsWith("fe80:") || host.startsWith("fc") || host.startsWith("fd")))
  ) throw new Error("Embeds must use a public HTTPS address.");
  return url.toString();
}
