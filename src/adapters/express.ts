import type { Request, Response } from "express";
import { OAuthException } from "../exceptions/oauth.exception";

import { OAuthRequest } from "../requests/request";
import { OAuthResponse } from "../responses/response";

export function responseFromExpress(res: Response): OAuthResponse {
  return new OAuthResponse(res);
}

export function requestFromExpress(req: Request): OAuthRequest {
  return new OAuthRequest(req);
}

export function handleExpressResponse(expressResponse: Response, oauthResponse: OAuthResponse): void {
  if (oauthResponse.status === 302) {
    if (!oauthResponse.headers.location) throw new Error("missing redirect location");
    expressResponse.set(oauthResponse.headers);
    expressResponse.redirect(oauthResponse.headers.location);
  } else {
    expressResponse.set(oauthResponse.headers);
    expressResponse.status(oauthResponse.status).send(oauthResponse.body);
  }
}

export function handleExpressError(e: unknown | OAuthException, res: Response): void {
  if (e instanceof OAuthException) {
    res.status(e.status);
    res.send({
      status: e.status,
      message: e.message,
    });
    return;
  }
  throw e;
}
