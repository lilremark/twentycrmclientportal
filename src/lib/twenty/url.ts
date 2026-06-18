export type TwentyEndpoint = "/graphql" | "/metadata";

export function normalizeTwentyBaseUrl(baseUrl: string) {
  const input = baseUrl.trim();
  if (!input) return "";
  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(input)
    ? input
    : `https://${input}`;
  const url = new URL(withProtocol);
  const cloudHost =
    url.hostname === "twenty.com" ||
    (url.hostname.endsWith(".twenty.com") &&
      url.hostname !== "api.twenty.com");
  if (cloudHost) return "https://api.twenty.com";
  return url.origin;
}

export function getTwentyEndpoint(
  baseUrl: string,
  endpoint: TwentyEndpoint,
  autoFormat = true,
) {
  const base = new URL(baseUrl);
  if (autoFormat) return new URL(endpoint, `${base.origin}/`);

  const path = base.pathname.replace(/\/+$/, "");
  if (!path || path === "/") return new URL(endpoint, `${base.origin}/`);
  if (/\/(graphql|metadata)$/i.test(path)) {
    base.pathname = path.replace(/\/(graphql|metadata)$/i, endpoint);
    return base;
  }
  base.pathname = `${path}${endpoint}`;
  return base;
}

export function getTwentyRestRecordEndpoint(
  baseUrl: string,
  objectNamePlural: string,
  recordId: string,
  autoFormat = true,
) {
  const base = new URL(baseUrl);
  const configuredPath = base.pathname
    .replace(/\/+$/, "")
    .replace(/\/(graphql|metadata)$/i, "");
  const prefix = autoFormat
    ? `${base.origin}/rest/`
    : `${base.origin}${configuredPath}/rest/`;
  return new URL(
    `${encodeURIComponent(objectNamePlural)}/${encodeURIComponent(recordId)}`,
    prefix,
  );
}
