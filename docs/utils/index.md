---
title: Utils
---

# {{ $frontmatter.title }}

## JwtService

@see [JwtService](https://github.com/jasonraimondi/ts-oauth2-server/blob/main/src/utils/jwt.ts)

Using [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken)

### Example Extra Params Usage

```typescript
import { JwtService } from '@jmondi/oauth2-server';

export class MyCustomJwtService extends JwtService {
  extraTokenFields({ user, client }: ExtraAccessTokenFieldArgs) {
    return {
      email: user?.email,
      client_id: client.id,
    }
  }
}
```

## DateInterval

using [ms](https://github.com/vercel/ms)
