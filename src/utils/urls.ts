export function tryParseUrl(url: string): URL | undefined {
  try {
    return new URL(url);
  } catch {
    return undefined;
  }
}

const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

/**
 * Exact redirect URI matching per RFC 6749 §3.1.2.3 / RFC 9700 §2.1, compared
 * after WHATWG URL normalization. Sole exception (RFC 8252 §7.3): when the
 * registered URI is a loopback redirect — `http` scheme with hostname
 * `localhost`, `127.0.0.1`, or `[::1]` — the port may vary between
 * registration and request. The host itself must still match exactly.
 */
export function redirectUriMatches(requested: string, registered: string): boolean {
  let requestedUrl: URL;
  let registeredUrl: URL;

  try {
    requestedUrl = new URL(requested);
    registeredUrl = new URL(registered);
  } catch (error) {
    return requested === registered;
  }

  const registeredIsLoopback = registeredUrl.protocol === "http:" && LOOPBACK_HOSTNAMES.has(registeredUrl.hostname);

  if (registeredIsLoopback && requestedUrl.hostname === registeredUrl.hostname) {
    requestedUrl.port = "";
    registeredUrl.port = "";
  }

  return requestedUrl.href === registeredUrl.href;
}
