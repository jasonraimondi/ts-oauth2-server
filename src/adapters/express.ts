import { Request as ExpressRequest, Response as ExpressResponse } from "express";
import type { Request, Response } from "express";
import { OAuthException } from "../exceptions/oauth.exception";

import { OAuthRequest } from "../requests/request";
import { OAuthResponse } from "../responses/response";

export function responseFromExpress(res: Response) {
  return new OAuthResponse(res);
}

export function requestFromExpress(req: Request) {
  return new OAuthRequest(req);
}

export function handleExpressResponse(_req: ExpressRequest, res: ExpressResponse, response: OAuthResponse) {
  if (response.status === 302) {
    if (!response.headers.location) throw new Error("missing redirect location");
    res.set(response.headers);
    res.redirect(response.headers.location);
  } else {
    res.set(response.headers);
    res.status(response.status).send(response.body);
  }
}

export function handleExpressError(e: any, res: ExpressResponse) {
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