---
sidebar_position: 1
---

# Vanilla

:::info

Available in >3.4.0

:::

This adapter provides utility functions to convert between vanilla JavaScript [Request](https://developer.mozilla.org/en-US/docs/Web/API/Request) and [Response](https://developer.mozilla.org/en-US/docs/Web/API/Response) objects and the `OAuthRequest`/`OAuthResponse` objects used by the this package.

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

## Example

```ts
import { requestFromVanilla, responseToVanilla } from "@jmondi/oauth2-server/vanilla";

import { Hono } from 'hono'
const app = new Hono()
  
// ...

app.post('/oauth2/token', async (c) => {
  const authorizationServer = c.get("authorization_server");
  
  const oauthResponse = await authorizationServer
    .respondToAccessTokenRequest(requestFromVanilla(request))
    .catch(e => {
      error(400, e.message);
    });

  return responseToVanilla(oauthResponse);
});

export default app
```
