# JWT / Access Tokens

## Issuer (**iss** [rfc](https://tools.ietf.org/html/rfc7519#section-4.1.1))

To set the `iss` claim, set the `issuer` option in [the AuthorizationServer configuration](../authorization_server/configuration.md).

## Audience (**aud** [rfc](https://tools.ietf.org/html/rfc7519#section-4.1.3))

To set the `aud` claim, send an audience parameter with the request. The server accepts these names:

| Endpoint     | Query               | Body                |
| ------------ | ------------------- | ------------------- |
| `/token`     | `aud` \| `audience` | `aud` \| `audience` |
| `/authorize` | `aud` \| `audience` |                     |

## Extra Token Fields

To add more fields to an Access Token, write the `extraTokenFields` method in your `JwtService` class.

```ts
import { JwtService } from "@jmondi/oauth2-server";

export class MyCustomJwtService extends JwtService {
  extraTokenFields(params: ExtraAccessTokenFieldArgs) {
    const { user = undefined, client, originatingAuthCodeId } = params;
    return {
      email: user?.email,
      originatingAuthCodeId,
      myCustomProps: "this will be in the decoded token!",
    };
  }
}
```
