import { OAuthRequest } from "../requests/request.js";
import { OAuthResponse } from "../responses/response.js";
import { ErrorType, OAuthException } from "../exceptions/oauth.exception.js";
import { isOAuthError } from "../utils/errors.js";

/**
 * Converts a standard Fetch API Response object to an OAuthResponse.
 *
 * @param res - Fetch API Response object
 * @returns OAuthResponse instance
 */
export function responseFromVanilla(res: Response): OAuthResponse {
  const headers: Record<string, unknown> = {};
  res.headers.forEach((value, key) => {
    if (key === "cookie") return;
    headers[key] = value;
  });

  return new OAuthResponse({
    headers: headers,
  });
}

/**
 * Converts an OAuthResponse to a standard Fetch API Response.
 * Properly handles both regular responses and redirects.
 *
 * @param oauthResponse - OAuth response to convert
 * @returns Fetch API Response object
 * @throws {OAuthException} When redirect location is missing for 302 responses
 *
 * @example
 * ```ts
 * const oauthResponse = await authorizationServer.respondToAccessTokenRequest(req);
 * return responseToVanilla(oauthResponse);
 * ```
 */
export function responseToVanilla(oauthResponse: OAuthResponse): Response {
  if (oauthResponse.status === 302) {
    if (typeof oauthResponse.headers.location !== "string" || oauthResponse.headers.location === "") {
      throw new OAuthException(`missing redirect location`, ErrorType.InvalidRequest);
    }
    return new Response(null, {
      status: 302,
      headers: {
        Location: oauthResponse.headers.location,
      },
    });
  }

  return new Response(JSON.stringify(oauthResponse.body), {
    status: oauthResponse.status,
    headers: oauthResponse.headers,
  });
}

/**
 * Converts a standard Fetch API Request object to an OAuthRequest.
 * Handles both URL-encoded and JSON request bodies.
 *
 * @param req - Fetch API Request object
 * @returns Promise that resolves to an OAuthRequest instance
 *
 * @example
 * ```ts
 * import { requestFromVanilla } from "@jmondi/oauth2-server/vanilla";
 *
 * const authRequest = await authorizationServer.validateAuthorizationRequest(
 *   await requestFromVanilla(req)
 * );
 * ```
 */
export async function requestFromVanilla(req: Request): Promise<OAuthRequest> {
  const url = new URL(req.url);
  const query: Record<string, unknown> = Object.fromEntries(url.searchParams);
  const headers: Record<string, unknown> = Object.fromEntries(req.headers);

  let body: Record<string, unknown> = {};
  const rawContentType = req.headers.get("content-type") || "";
  const contentType = rawContentType.split(";")[0].trim();

  if (req.body) {
    if (contentType === "application/x-www-form-urlencoded") {
      body = Object.fromEntries(new URLSearchParams(await req.text()));
    } else if (contentType === "application/json") {
      body = (await req.json()) as Record<string, unknown>;
    }
  }

  return new OAuthRequest({
    query: query,
    body: body,
    headers: headers,
  });
}

/**
 * Converts any error to a proper OAuth response.
 * Use this to handle errors in Vanilla/Fetch API implementations.
 *
 * @param e - Error object, typically an OAuthException
 * @returns OAuthResponse with appropriate error details
 *
 * @example
 * ```ts
 * try {
 *   const oauthResponse = await authorizationServer.respondToAccessTokenRequest(req);
 *   return responseToVanilla(oauthResponse);
 * } catch (e) {
 *   return responseToVanilla(handleVanillaError(e));
 * }
 * ```
 */
export function handleVanillaError(e: unknown | OAuthException): OAuthResponse {
  if (isOAuthError(e)) {
    return new OAuthResponse({
      status: e.status,
      headers: { "content-type": "application/json" },
      body: {
        status: e.status,
        message: e.message,
        error: e.errorType,
        error_description: e.errorDescription ?? e.error,
      },
    });
  }

  // Convert generic errors to OAuthException
  const errorMessage = e instanceof Error ? e.message : "An unexpected error occurred";
  const oauthError = OAuthException.internalServerError(errorMessage);

  return new OAuthResponse({
    status: oauthError.status,
    headers: { "content-type": "application/json" },
    body: {
      status: oauthError.status,
      message: oauthError.message,
      error: oauthError.errorType,
      error_description: oauthError.errorDescription ?? oauthError.error,
    },
  });
}
