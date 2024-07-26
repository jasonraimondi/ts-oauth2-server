# Fastify

:::info

Available in >2.0.0

:::


This adapter provides utility functions to convert between Fastify [Request](https://fastify.dev/docs/latest/Reference/Request/) and [Reply](https://fastify.dev/docs/latest/Reference/Reply/) objects and the `OAuthRequest`/`OAuthResponse` objects used by this package.

## Functions

```ts
requestFromFastify(req: FastifyRequest): OAuthRequest
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

const app = fastify()

// ...

app.post('/oauth2/token', async (request: fastify.Request, reply: fastify.Reply) => {
  const authorizationServer = request.server.authorizationServer;
  
  try {
    const oauthResponse = await authorizationServer
      .respondToAccessTokenRequest(requestFromFastify(request));

    handleFastifyReply(reply, oauthResponse);
  } catch (e) {
    handleFastifyError(reply, e);
  }
});
```
