export type TwentyEndpoint = "/graphql" | "/metadata";

export function getTwentyEndpoint(
  baseUrl: string,
  endpoint: TwentyEndpoint,
) {
  const base = new URL(baseUrl);
  return new URL(endpoint, `${base.origin}/`);
}
