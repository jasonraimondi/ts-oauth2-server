export function tryParseUrl(url: string): URL | undefined {
  try {
    return new URL(url);
  } catch {
    return undefined;
  }
}

const LOOPBACK_IP_HOSTNAMES = new Set(["127.0.0.1", "[::1]"]);

export interface RedirectUriMatchOptions {
  /**
   * Extend the loopback port exception to the literal `localhost` hostname.
   * RFC 8252 §7.3's MUST covers only the loopback IP literals; §8.3 leaves
   * `localhost` discretionary. Defaults to `true`.
   */
  treatLocalhostAsLoopback?: boolean;
}

/**
 * Exact redirect URI matching per RFC 6749 §3.1.2.3 / RFC 9700 §2.1, compared
 * after WHATWG URL normalization. Sole exception (RFC 8252 §7.3): when the
 * registered URI is a loopback redirect — `http` scheme with hostname
 * `127.0.0.1` or `[::1]` (plus `localhost` unless `treatLocalhostAsLoopback`
 * is disabled) — the port may vary between registration and request. The host
 * itself must still match exactly.
 */
export function redirectUriMatches(
  requested: string,
  registered: string,
  options: RedirectUriMatchOptions = {},
): boolean {
  const { treatLocalhostAsLoopback = true } = options;

  let requestedUrl: URL;
  let registeredUrl: URL;

  try {
    requestedUrl = new URL(requested);
    registeredUrl = new URL(registered);
  } catch (error) {
    return requested === registered;
  }

  const registeredIsLoopback =
    registeredUrl.protocol === "http:" &&
    (LOOPBACK_IP_HOSTNAMES.has(registeredUrl.hostname) ||
      (treatLocalhostAsLoopback && registeredUrl.hostname === "localhost"));

  if (registeredIsLoopback && requestedUrl.hostname === registeredUrl.hostname) {
    requestedUrl.port = "";
    registeredUrl.port = "";
  }

  return requestedUrl.href === registeredUrl.href;
}
