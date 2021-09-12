import { PrismaClient } from "@prisma/client";
import Fastify, { FastifyReply, FastifyRequest } from "fastify";
import { AuthorizationServer, DateInterval, JwtService } from "@jmondi/oauth2-server";
import {
  requestFromFastify,
  responseFromFastify,
  handleFastifyError,
  handleFastifyReply,
} from "@jmondi/oauth2-server/dist/adapters/fastify";

import { ClientRepository } from "./repositories/client_repository";
import { AuthCodeRepository } from "./repositories/auth_code_repository";
import { TokenRepository } from "./repositories/token_repository";
import { UserRepository } from "./repositories/user_repository";
import { ScopeRepository } from "./repositories/scope_repository";

async function bootstrap() {
  const prisma = new PrismaClient();
  const authorizationServer = new AuthorizationServer(
    new AuthCodeRepository(prisma.oAuthAuthCode),
    new ClientRepository(prisma.oAuthClient),
    new TokenRepository(prisma.oAuthToken),
    new ScopeRepository(prisma.oAuthScope),
    new UserRepository(prisma.user),
    new JwtService(process.env.OAUTH_CODES_SECRET!),
  );
  authorizationServer.enableGrantTypes(
    ["authorization_code", new DateInterval("15m")],
    ["client_credentials", new DateInterval("1d")],
    "refresh_token",
    "password",
    "implicit",
  );

  const fastify = Fastify({ logger: true });

  fastify.get("/authorize", async (req: FastifyRequest, res: FastifyReply) => {
    try {
      // Validate the HTTP request and return an AuthorizationRequest object.
      const authRequest = await authorizationServer.validateAuthorizationRequest(requestFromFastify(req));

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
      return handleFastifyReply(res, oauthResponse);
    } catch (e) {
      handleFastifyError(e, res);
    }
  });

  fastify.post("/token", async (req: FastifyRequest, res: FastifyReply) => {
    const request = requestFromFastify(req);
    const response = responseFromFastify(res);
    try {
      const oauthResponse = await authorizationServer.respondToAccessTokenRequest(request, response);
      return handleFastifyReply(res, oauthResponse);
    } catch (e) {
      handleFastifyError(e, res);
      return;
    }
  });

  fastify.get("/", (_req: FastifyRequest, res: FastifyReply) => {
    res.send({
      success: true,
      GET: ["/authorize"],
      POST: ["/token"],
    });
  });

  await fastify.listen(3000);

  console.log("app is listening on localhost:3000");
}

bootstrap().catch(console.log);
