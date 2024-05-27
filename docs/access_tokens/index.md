# Access Token

## Optional Claims

### Issuer (**iss** [rfc](https://tools.ietf.org/html/rfc7519#section-4.1.1)) 

You can customize the `iss` property by setting the `issuer` property in [the AuthorizationServer configuration](/configuration/).

### Audience (**aud** [rfc](https://tools.ietf.org/html/rfc7519#section-4.1.3)) 

You can customize the `aud` field by passing `aud`.

| Endpoint     | Query               | Body                |
|--------------|---------------------|---------------------|
| `/token`     | `aud` \| `audience` | `aud` \| `audience` |
| `/authorize` | `aud` \| `audience` |                     |

## Implementing `extraTokenFields`

You can add additional properties to the encoded access token by implementing the `extraTokenFields` method in your `JwtService` class.

```ts
import { JwtService } from '@jmondi/oauth2-server';

export class MyCustomJwtService extends JwtService {
  extraTokenFields(params: ExtraAccessTokenFieldArgs) {
    const { user = undefined, client } = params;
    return {
      email: user?.email,
      myCustomProps: "this will be in the decoded token!",
    }
  }
}
```
