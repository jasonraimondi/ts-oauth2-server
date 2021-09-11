import { json, urlencoded } from "body-parser";
import Express from "express";
import {
  requestFromExpress,
  responseFromExpress,
  handleExpressError,
  handleExpressResponse,
} from "../../src/adapters/express";

import { inMemoryAuthorizationServer } from "./oauth_authorization_server";

const app = Express();

app.use(json());
app.use(urlencoded({ extended: false }));

const authorizationServer = inMemoryAuthorizationServer;

app.get("/authorize", async (req: Express.Request, res: Express.Response) => {
  try {
    // Validate the HTTP request and return an AuthorizationRequest object.
    const authRequest = await authorizationServer.validateAuthorizationRequest(requestFromExpress(req));

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
    return handleExpressResponse(req, res, oauthResponse);
  } catch (e) {
    handleExpressError(e, res);
  }
});

app.post("/token", async (req: Express.Request, res: Express.Response) => {
  try {
    const oauthResponse = await authorizationServer.respondToAccessTokenRequest(req, responseFromExpress(res));
    return handleExpressResponse(req, res, oauthResponse);
  } catch (e) {
    handleExpressError(e, res);
    return;
  }
});
