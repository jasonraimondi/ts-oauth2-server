import { json, urlencoded } from "body-parser";
import Express from "express";
import { Connection, createConnection } from "typeorm";

import { AuthorizationServer, DateInterval, JwtService, OAuthRequest, OAuthResponse } from "../../../src";
import { ClientRepository } from "./repositories/client_repository";
import { AuthCodeRepository } from "./repositories/auth_code_repository";
import { TokenRepository } from "./repositories/toke_repository";
import { User } from "./entities/user";
import { AuthCode } from "./entities/auth_code";
import { Token } from "./entities/token";
import { UserRepository } from "./repositories/user_repository";
import { Scope } from "./entities/scope";
import { handleError, handleResponse } from "./utils/utils";
import { Client } from "./entities/client";
import { ScopeRepository } from "./repositories/scope_repository";

async function bootstrap() {
  const connection: Connection = await createConnection();

  const authorizationServer = new AuthorizationServer(
    new AuthCodeRepository(connection.getRepository(AuthCode)),
    new ClientRepository(connection.getRepository(Client)),
    new TokenRepository(connection.getRepository(Token)),
    new ScopeRepository(connection.getRepository(Scope)),
    new UserRepository(connection.getRepository(User)),
    new JwtService(process.env.OAUTH_CODES_SECRET!),
  );
  authorizationServer.enableGrantTypes(
    ["authorization_code", new DateInterval("15m")],
    ["client_credentials", new DateInterval("1d")],
    "refresh_token",
    "password",
    "implicit"
  );

  const app = Express();

  app.use(json());
  app.use(urlencoded({ extended: false }));

  app.get("/authorize", async (req: Express.Request, res: Express.Response) => {
    const request = new OAuthRequest(req);

    try {
      // Validate the HTTP request and return an AuthorizationRequest object.
      const authRequest = await authorizationServer.validateAuthorizationRequest(request);

      // The auth request object can be serialized and saved into a user's session.
      // You will probably want to redirect the user at this point to a login endpoint.

      // Once the user has logged in set the user on the AuthorizationRequest
      console.log("Once the user has logged in set the user on the AuthorizationRequest");
      const user = { id: "abc", email: "user@example.com" };
      authRequest.user = user;

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

  app.get("/", (req: Express.Request, res: Express.Response) => {
    res.json({
      success: true,
      GET: ["/authorize"],
      POST: ["/token"]
    })
  });

  app.listen(3000)
}

bootstrap().catch(console.log);
