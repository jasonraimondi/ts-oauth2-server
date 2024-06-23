# Express

[https://expressjs.com/](https://expressjs.com/)

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
