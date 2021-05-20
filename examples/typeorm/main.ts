import { json, urlencoded } from "body-parser";
import Express from "express";

import { OAuthException } from "../../src";
import { OAuthRequest } from "../../src";
import { OAuthResponse } from "../../src";
import { typeormAuthorizationServer } from "./typeormAuthorizationServer";

const app = Express();

app.use(json());
app.use(urlencoded({ extended: false }));

const authorizationServer = typeormAuthorizationServer;

app.get("/authorize", async (req: Express.Request, res: Express.Response) => {
  const request = new OAuthRequest(req);

  try {
    // Validate the HTTP request and return an AuthorizationRequest object.
    const authRequest = await authorizationServer.validateAuthorizationRequest(request);

    // The auth request object can be serialized and saved into a user's session.
    // You will probably want to redirect the user at this point to a login endpoint.

    // Once the user has logged in set the user on the AuthorizationRequest
    console.log("Once the user has logged in set the user on the AuthorizationRequest");
    authRequest.user = { id: "abc", email: "user@example.com" };

    // At this point you should redirect the user to an authorization page.
    // This form will ask the user to approve the client and the scopes requested.

    // Once the user has approved or denied the client update the status
    // (true = approved, false = denied)
    authRequest.isAuthorizationApproved = true;

    // Return the HTTP redirect response
    const oauthResponse = await authorizationServer.completeAuthorizationRequest(authRequest);
    return handleResponse(req, res, oauthResponse);
  } catch (e) {
    handleError(e, res);
  }
});

app.post("/token", async (req: Express.Request, res: Express.Response) => {
  const response = new OAuthResponse(res);
  try {
    const oauthResponse = await authorizationServer.respondToAccessTokenRequest(req, response);
    return handleResponse(req, res, oauthResponse);
  } catch (e) {
    handleError(e, res);
    return;
  }
});

function handleError(e: any, res: Express.Response) {
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

export { app as typeormExpressApp };

function handleResponse(req: Express.Request, res: Express.Response, response: OAuthResponse) {
  if (response.status === 302) {
    if (!response.headers.location) {
      throw new Error("missing redirect location"); // @todo this
    }
    res.set(response.headers);
    res.redirect(response.headers.location);
  } else {
    res.set(response.headers);
    res.status(response.status).send(response.body);
  }
}
