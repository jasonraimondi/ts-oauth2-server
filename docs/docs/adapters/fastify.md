# Fastify

[https://www.fastify.io/](https://www.fastify.io/)

```typescript
import {
  requestFromFastify,
  handleFastifyReply,
  handleFastifyError,
} from "@jmondi/oauth2-server/fastify";
```

The following functions are imported directly from the adapter instead of the root package.

```typescript
requestFromFastify(req: FastifyRequest): OAuthRequest;
```

Helper function to return an OAuthRequest from an `FastifyRequest`.

```typescript
handleFastifyReply(fastifyReply: FasitfyReply, oauthResponse: OAuthResponse): void;
```

Helper function that handles the express response after authorization.

```typescript
handleFastifyError(reply: FasitfyReply, e: unknown | OAuthException): void;
```

Helper function that handles the express response if an error was thrown.
