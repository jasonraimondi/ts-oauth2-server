import { OAuthRequest } from "../requests/request.js";
import { OAuthResponse } from "../responses/response.js";

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
  if (req.body != null && (req.method === "POST" || req.method === "PUT" || req.method === "PATCH")) {
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
