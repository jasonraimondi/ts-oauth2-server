
# unsupported grant_type

First, check if you're enabling the desired grant type on the AuthorizationServer. See https://tsoauth2server.com/docs/authorization_server/#enabling-grant-types for more.

```typescript
import {AuthorizationServer} from "@jmondi/oauth2-server";

const authorizationServer = new AuthorizationServer(...);
authorizationServer.enableGrantType("client_credentials");
```
