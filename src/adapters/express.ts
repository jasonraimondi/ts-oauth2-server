import type { Request, Response } from "express";
import { OAuthException } from "../exceptions/oauth.exception.js";

import { OAuthRequest } from "../requests/request.js";
import { OAuthResponse } from "../responses/response.js";
import { isOAuthError } from "../utils/errors.js";

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

// @todo v4.0 flip these to always be Express as first arg, OAuth as second. Then update Docs
export function handleExpressError(e: unknown | OAuthException, res: Response): void {
  if (isOAuthError(e)) {
    res.status(e.status);
    res.send({
      status: e.status,
      message: e.message,
      error: e.errorType,
      error_description: e.errorDescription ?? e.error,
    });
    return;
  }
  throw e;
}
