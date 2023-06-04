import "dotenv/config";

import { PrismaClient } from "@prisma/client";
import { json, urlencoded } from "body-parser";
import Express from "express";
import { AuthorizationServer, DateInterval, JwtService } from "@jmondi/oauth2-server";
import {
  requestFromExpress,
  handleExpressError,
  handleExpressResponse,
} from "@jmondi/oauth2-server/dist/adapters/express";

import { AuthCodeRepository } from "./repositories/auth_code_repository";
import { ClientRepository } from "./repositories/client_repository";
import { ScopeRepository } from "./repositories/scope_repository";
import { TokenRepository } from "./repositories/token_repository";
import { UserRepository } from "./repositories/user_repository";

async function bootstrap() {
  const prisma = new PrismaClient();
  const authorizationServer = new AuthorizationServer(
    new ClientRepository(prisma.oAuthClient),
    new TokenRepository(prisma.oAuthToken),
    new ScopeRepository(prisma.oAuthScope),
    process.env.OAUTH_CODES_SECRET!,
  );
  authorizationServer.enableGrantTypes(
    ["authorization_code", new DateInterval("15m")],
    ["client_credentials", new DateInterval("1d")],
    "refresh_token",
    "password",
    "implicit",
  );

  const app = Express();

  app.use(json());
  app.use(urlencoded({ extended: false }));

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
      return handleExpressResponse(res, oauthResponse);
    } catch (e) {
      handleExpressError(e, res);
    }
  });

  app.post("/token", async (req: Express.Request, res: Express.Response) => {
    try {
      const oauthResponse = await authorizationServer.respondToAccessTokenRequest(req);
      return handleExpressResponse(res, oauthResponse);
    } catch (e) {
      handleExpressError(e, res);
      return;
    }
  });

  app.get("/", (_: Express.Request, res: Express.Response) => {
    res.json({
      success: true,
      GET: ["/authorize"],
      POST: ["/token"],
    });
  });

  app.listen(3000);

  console.log("app is listening on localhost:3000");
}

bootstrap().catch(console.log);
