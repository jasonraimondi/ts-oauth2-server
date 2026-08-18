# Express

:::info

Available in >2.0.0

:::

This adapter converts between the Express [Request](https://expressjs.com/en/api.html#req) and [Response](https://expressjs.com/en/api.html#res) objects and the `OAuthRequest` and `OAuthResponse` objects of this package.

## Functions

```ts
requestFromExpress(req: Express.Request): OAuthRequest
```

```ts
responseFromExpress(res: Express.Response): OAuthResponse
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
    handleExpressError(e, res);
  }
});
```
