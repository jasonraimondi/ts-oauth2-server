import { OAuthRequest } from "../requests/request.js";
import { OAuthResponse } from "../responses/response.js";
import { ErrorType, OAuthException } from "../exceptions/oauth.exception.js";

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

export async function requestFromVanilla(req: Request): Promise<OAuthRequest> {
  const url = new URL(req.url);
  const query: Record<string, unknown> = Object.fromEntries(url.searchParams);
  const headers: Record<string, unknown> = Object.fromEntries(req.headers);

  let body: Record<string, unknown> = {};
  const contentType = headers['content-type'];

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
