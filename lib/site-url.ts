export function resolveRequestOrigin(headersList: Headers) {
  const origin = headersList.get("origin");
  const referer = headersList.get("referer");
  const host = headersList.get("host");
  const forwardedHost = headersList.get("x-forwarded-host");
  const forwardedProto = headersList.get("x-forwarded-proto") ?? "https";

  if (origin) {
    return origin;
  }

  if (referer) {
    try {
      return new URL(referer).origin;
    } catch {
      // Fall through to forwarded/host headers.
    }
  }

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  if (host) {
    const proto = host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : forwardedProto;
    return `${proto}://${host}`;
  }

  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export function sanitizeSiteUrl(siteUrl: FormDataEntryValue | null) {
  if (typeof siteUrl !== "string" || siteUrl.length === 0) {
    return null;
  }

  try {
    return new URL(siteUrl).origin;
  } catch {
    return null;
  }
}
