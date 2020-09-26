import type { Request, Response } from "express";
import express from "express";

import { inMemoryAuthorizationServer } from "./oauth_authorization_server";
import { OAuthException } from "../../src/exceptions";
import { json } from "body-parser";

const app = express();
const port = 3000;

app.use(json());

const authorizationServer = inMemoryAuthorizationServer;

app.get("/authorize", async (req: Request, res: Response) => {
  try {
    // Validate the HTTP request and return an AuthorizationRequest object.
    const authRequest = await authorizationServer.validateAuthorizationRequest(req);

    // The auth request object can be serialized and saved into a user's session.
    // You will probably want to redirect the user at this point to a login endpoint.

    // Once the user has logged in set the user on the AuthorizationRequest
    console.log("Once the user has logged in set the user on the AuthorizationRequest");
    const user = { identifier: "abc", email: "user@example.com" };
    authRequest.user = user;

    // At this point you should redirect the user to an authorization page.
    // This form will ask the user to approve the client and the scopes requested.

    // Once the user has approved or denied the client update the status
    // (true = approved, false = denied)
    authRequest.isAuthorizationApproved = true;

    // Return the HTTP redirect response
    await authorizationServer.completeAuthorizationRequest(authRequest, res);
  } catch (e) {
    handleError(e, res);
  }
});

app.post("/token", async (req: Request, res: Response) => {
  try {
    return await inMemoryAuthorizationServer.respondToAccessTokenRequest(req, res);
  } catch (e) {
    handleError(e, res);
    return;
  }
});

function handleError(e: any, res: Response) {
  // @todo clean up error handling
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

export { app as inMemoryExpressApp };
