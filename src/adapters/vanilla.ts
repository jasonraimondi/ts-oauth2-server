import { OAuthRequest } from "../requests/request.js";
import { OAuthResponse } from "../responses/response.js";
import { ErrorType, OAuthException } from "../exceptions/oauth.exception.js";
import type { ReadableStream } from "stream/web";

export function responseFromVanilla(res: Response): OAuthResponse {
  const headers: Record<string, unknown> = {};
  Object.entries(res.headers).forEach(([key, value]) => {
    headers[key] = value;
  });

  return new OAuthResponse({
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

export async function requestFromVanilla(req: Request): Promise<OAuthRequest> {
  const url = new URL(req.url);
  const query: Record<string, unknown> = {};
  url.searchParams.forEach((value, key) => {
    query[key] = value;
  });

  let body: Record<string, unknown> = {};

  if (isReadableStream(req.body)) {
    body = JSON.parse(await streamToString(req.body));
  } else if (req.body != null) {
    body = JSON.parse(req.body);
  }

  const headers: Record<string, unknown> = {};
  req.headers.forEach((value, key) => {
    if (key === "cookie") return;
    headers[key] = value;
  });

  return new OAuthRequest({
    query: query,
    body: body,
    headers: headers,
  });
}

async function streamToString(stream: ReadableStream): Promise<string> {
  const reader = stream.getReader();
  let result = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    result += new TextDecoder().decode(value);
  }
  return result;
}

function isReadableStream(value: unknown): value is ReadableStream {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof (value as ReadableStream).getReader === "function" &&
    typeof (value as ReadableStream).tee === "function" &&
    typeof (value as ReadableStream).locked !== "undefined"
  );
}
