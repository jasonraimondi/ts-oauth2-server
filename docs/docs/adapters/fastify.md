# Fastify

:::info

Available in >2.0.0

:::


This adapter converts between the Fastify [Request](https://fastify.dev/docs/latest/Reference/Request/) and [Reply](https://fastify.dev/docs/latest/Reference/Reply/) objects and the `OAuthRequest` and `OAuthResponse` objects of this package.

## Functions

```ts
requestFromFastify(req: FastifyRequest): OAuthRequest
```

```ts
responseFromFastify(res: FastifyReply): OAuthResponse
```

```ts
handleFastifyReply(fastifyReply: FastifyReply, oauthResponse: OAuthResponse): void
```

```ts
handleFastifyError(e: unknown | OAuthException, reply: FastifyReply): void
```

## Example

```ts
import { requestFromFastify, handleFastifyReply, handleFastifyError } from "@jmondi/oauth2-server/fastify";
import fastify from 'fastify'
import type { FastifyRequest, FastifyReply } from 'fastify'

const app = fastify()

// ...

app.post('/oauth2/token', async (request: FastifyRequest, reply: FastifyReply) => {
  const authorizationServer = request.server.authorizationServer;
  
  try {
    const oauthResponse = await authorizationServer
      .respondToAccessTokenRequest(requestFromFastify(request));

    handleFastifyReply(reply, oauthResponse);
  } catch (e) {
    handleFastifyError(e, reply);
  }
});
```
