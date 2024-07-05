import { OAuthRequest } from "../requests/request.js";
import { OAuthResponse } from "../responses/response.js";
import { ErrorType, OAuthException } from "../exceptions/oauth.exception.js";

export function responseFromVanilla(res: Response): OAuthResponse {
  const headers: Record<string, unknown> = {};
  Object.entries(res.headers).forEach(([key, value]) => {
    headers[key] = value;
  });

  return new OAuthResponse({
    headers: headers,
  });
}

export function requestFromVanilla(req: Request): OAuthRequest {
  const url = new URL(req.url);
  const query: Record<string, unknown> = {};
  url.searchParams.forEach((value, key) => {
    query[key] = value;
  });

  let body: Record<string, unknown> = {};
  if (req.body != null) {
    body = JSON.parse(req.body.toString());
  }

  const headers: Record<string, unknown> = {};
  Object.entries(req.headers).forEach(([key, value]) => {
    headers[key] = value;
  });

  return new OAuthRequest({
    query: query,
    body: body,
    headers: headers,
  });
}

export function responseToVanilla(oauthResponse: OAuthResponse): Response {
  if (oauthResponse.status === 302) {
    if (!oauthResponse.headers.location) {
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
