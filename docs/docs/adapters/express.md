# Express

[Express](https://expressjs.com/)

Adapts the [Express.Request](https://expressjs.com/en/api.html#req) and [Express.Response](https://expressjs.com/en/api.html#res) for use with `@jmondi/oauth2-server`.

```typescript
import {
  requestFromExpress,
  handleExpressResponse,
  handleExpressError,
} from "@jmondi/oauth2-server/express";
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
