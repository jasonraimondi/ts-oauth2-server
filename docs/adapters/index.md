---
title: Adapters
---

# Adapters

Adapters are a set of helper functions to provide framework specific integration into `@jmondi/oauth2-server`. Currently, Express and Fastify are both supported.

## Express

[https://expressjs.com/](https://expressjs.com/)

```typescript 
import {
  requestFromExpress,
  handleExpressResponse,
  handleExpressError,
} from "@jmondi/oauth2-server/dist/adapters/express"
```

```typescript
requestFromExpress(req: Express.Request): OAuthRequest;
```

Helper function to return an OAuthRequest from an `Express.Request`.

```typescript
handleExpressResponse(expressResponse: Express.Response, oauthResponse: OAuthResponse): void;
```

Helper function that handles the express response after authorization.

```typescript
handleExpressError(res: Express.Response, e: unknown | OAuthException): void;
```

Helper function that handles the express response if an error was thrown.

## Fastify

[https://www.fastify.io/](https://www.fastify.io/)

```typescript 
import {
  requestFromFastify,
  handleFastifyReply,
  handleFastifyError,
} from "@jmondi/oauth2-server/dist/adapters/fastify"
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
