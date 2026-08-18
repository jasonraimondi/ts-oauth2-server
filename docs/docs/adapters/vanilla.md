# Vanilla

:::info

Available in >3.4.0

:::

This adapter converts between the native JavaScript [Request](https://developer.mozilla.org/en-US/docs/Web/API/Request) and [Response](https://developer.mozilla.org/en-US/docs/Web/API/Response) objects and the `OAuthRequest` and `OAuthResponse` objects of this package.

## Functions

```ts
responseFromVanilla(res: Response): OAuthResponse
```

```ts
requestFromVanilla(req: Request): Promise<OAuthRequest>
```

```ts
responseToVanilla(oauthResponse: OAuthResponse): Response
```

```ts
handleVanillaError(e: unknown | OAuthException): OAuthResponse
```

## Example

```ts
import { requestFromVanilla, responseToVanilla, handleVanillaError } from "@jmondi/oauth2-server/vanilla";

import { Hono } from 'hono'
const app = new Hono()

// ...

app.post('/oauth2/token', async (c) => {
  const authorizationServer = c.get("authorization_server");

  try {
    const oauthResponse = await authorizationServer
      .respondToAccessTokenRequest(await requestFromVanilla(c.req.raw));

    return responseToVanilla(oauthResponse);
  } catch (e) {
    return responseToVanilla(handleVanillaError(e));
  }
});

export default app
```
