import type { Request, Response } from "express";

import { OAuthRequest } from "../requests/request";
import { OAuthResponse } from "../responses/response";

export function responseFromExpress(res: Response) {
  return new OAuthResponse(res);
}

export function requestFromExpress(req: Request) {
  return new OAuthRequest(req);
}

