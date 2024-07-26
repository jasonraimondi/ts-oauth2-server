# Express

:::info

Available in >2.0.0

:::

This adapter provides utility functions to convert between Express [Request](https://expressjs.com/en/api.html#req) and [Response](https://expressjs.com/en/api.html#res) objects and the `OAuthRequest`/`OAuthResponse` objects used by this package.

## Functions

```ts
requestFromExpress(req: Express.Request): OAuthRequest
```

```ts
handleExpressResponse(expressResponse: Express.Response, oauthResponse: OAuthResponse): void
```

```ts
handleExpressError(e: unknown | OAuthException, res: Express.Response): void
```

## Example

```ts
import { requestFromExpress, handleExpressResponse, handleExpressError } from "@jmondi/oauth2-server/express";
import express from 'express';

const app = express();

// ...

app.post('/oauth2/token', async (req: express.Request, res: express.Response) => {
  const authorizationServer = req.app.get('authorization_server');
  
  try {
    const oauthResponse = await authorizationServer
      .respondToAccessTokenRequest(requestFromExpress(req));

    handleExpressResponse(res, oauthResponse);
  } catch (e) {
    handleExpressError(res, e);
  }
});
```
