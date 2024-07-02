---
sidebar_position: 1
---

# Vanilla

:::info

Available in >3.4.0

:::

Adapts the Fetch [Request](https://developer.mozilla.org/en-US/docs/Web/API/Request) and [Response](https://developer.mozilla.org/en-US/docs/Web/API/Response) for use with `@jmondi/oauth2-server`.

```typescript
import {
  requestFromVanilla,
  handleVanillaReply,
  handleVanillaError,
} from "@jmondi/oauth2-server/vanilla";
```

The following functions are imported directly from the adapter instead of the root package.

```typescript
requestFromVanilla(req: Request): OAuthRequest;
```

Helper function to return an OAuthRequest from an `VanillaRequest`.

```typescript
handleVanillaReply(res: Response, oauthResponse: OAuthResponse): void;
```

Helper function that handles the express response after authorization.

```typescript
handleVanillaError(res: Response, e: unknown | OAuthException): void;
```

Helper function that handles the express response if an error was thrown.
