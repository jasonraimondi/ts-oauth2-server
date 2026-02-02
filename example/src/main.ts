import "dotenv/config";

import { PrismaClient } from "@prisma/client";
import bodyParser from "body-parser";
import Express from "express";
import { AuthorizationServer, DateInterval } from "@jmondi/oauth2-server";
import { handleExpressError, handleExpressResponse } from "@jmondi/oauth2-server/express";

import { AuthCodeRepository } from "./repositories/auth_code_repository.js";
import { ClientRepository } from "./repositories/client_repository.js";
import { ScopeRepository } from "./repositories/scope_repository.js";
import { TokenRepository } from "./repositories/token_repository.js";
import { UserRepository } from "./repositories/user_repository.js";
import { MyCustomJwtService } from "./utils/custom_jwt_service.js";
import { requireAuth, TokenValidationConfig } from "./middleware/auth.js";

async function bootstrap() {
  const prisma = new PrismaClient();
  const authCodeRepository = new AuthCodeRepository(prisma);
  const userRepository = new UserRepository(prisma);
  const tokenRepository = new TokenRepository(prisma);
  const jwtService = new MyCustomJwtService(process.env.OAUTH_CODES_SECRET!);

  const authorizationServer = new AuthorizationServer(
    new ClientRepository(prisma),
    tokenRepository,
    new ScopeRepository(prisma),
    jwtService,
  );
  authorizationServer.enableGrantTypes(
    ["client_credentials", new DateInterval("1d")],
    ["refresh_token", new DateInterval("30d")],
    { grant: "authorization_code", authCodeRepository, userRepository },
  );

  // Configuration for token validation middleware
  const authConfig: TokenValidationConfig = {
    jwtService,
    tokenRepository,
    // Uncomment and set these for additional security:
    // expectedIssuer: "https://auth.example.com",
    // expectedAudience: "https://api.example.com",
  };

  const app = Express();

  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }));

  // ============================================================
  // OAuth2 Endpoints
  // ============================================================

  app.get("/authorize", async (req: Express.Request, res: Express.Response) => {
    try {
      // Validate the HTTP request and return an AuthorizationRequest object.
      const authRequest = await authorizationServer.validateAuthorizationRequest(req);

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

  // ============================================================
  // Protected API Endpoints (demonstrate token validation)
  // ============================================================

  /**
   * Protected endpoint - requires valid access token
   * Returns information about the authenticated token
   */
  app.get("/api/me", requireAuth(authConfig), (req: Express.Request, res: Express.Response) => {
    // req.accessToken is populated by the middleware
    const { payload, scopes, token } = req.accessToken!;

    res.json({
      user_id: payload.sub ?? null,
      client_id: payload.cid,
      scopes,
      issued_at: new Date(payload.iat * 1000).toISOString(),
      expires_at: token.accessTokenExpiresAt.toISOString(),
    });
  });

  /**
   * Protected endpoint - requires specific scope
   * Demonstrates scope-based access control
   */
  app.get("/api/admin/stats", requireAuth(authConfig, ["admin"]), (_req: Express.Request, res: Express.Response) => {
    // Only accessible with "admin" scope
    res.json({
      total_users: 42,
      total_tokens: 123,
      message: "You have admin access!",
    });
  });

  /**
   * Protected endpoint - requires multiple scopes
   */
  app.delete(
    "/api/admin/users/:id",
    requireAuth(authConfig, ["admin", "users:delete"]),
    (req: Express.Request, res: Express.Response) => {
      // Only accessible with both "admin" AND "users:delete" scopes
      res.json({
        deleted: true,
        user_id: req.params.id,
      });
    },
  );

  // ============================================================
  // Index / Documentation
  // ============================================================

  app.get("/", (_: Express.Request, res: Express.Response) => {
    res.json({
      success: true,
      endpoints: {
        oauth: {
          "GET /authorize": "Authorization endpoint",
          "POST /token": "Token endpoint",
        },
        protected: {
          "GET /api/me": "Returns token info (requires valid token)",
          "GET /api/admin/stats": "Admin stats (requires 'admin' scope)",
          "DELETE /api/admin/users/:id": "Delete user (requires 'admin' + 'users:delete' scopes)",
        },
      },
    });
  });

  app.listen(3000);
  console.log("app is listening on http://localhost:3000");
}

bootstrap().catch(console.log);
