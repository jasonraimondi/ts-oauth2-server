# Authorization Code with PKCE

The server issues a temporary code, and the Client exchanges it for an Access Token. First the user authorizes the application. Then the server redirects the user to the application, and puts the code in the URL. Last, the application exchanges the code for the Access Token.

:::info Enable this grant

```ts
authorizationServer.enableGrantType({
  grant: "authorization_code",
  userRepository,
  authCodeRepository,
});
```

:::

### Flow

#### Part One

The Client redirects the user to `/authorize` with these query parameters:

- **response_type**: Set it to `code`.
- **client_id**: The identifier that you gave to the Client at registration.
- **redirect_uri**: The destination of the redirect after the authorization, for example `org.example.app://redirect`. It must match a [Registered Redirect URI](../getting_started/entities.md#client-entity) exactly.
- **state**: A random string from your application. Compare it with the returned value later.
- **code_challenge**: The code challenge. The next section shows you how to make it.
- **code_challenge_method**: Set it to `S256` for the SHA256 hash of the verifier. If you omit this parameter, the server uses `plain`, which the default `requiresS256` [configuration option](../authorization_server/configuration.md) rejects. Send `plain` for the verifier itself only when you disable `requiresS256`.

:::warning
Do **not** send the client secret in part one of the authorization code flow.
:::

::: details View sample authorization_code (part 1) request
```http
GET /authorize HTTP/1.1
Host: example.com

response_type=code
&client_id=xxxxxxx
&redirect_uri=http://localhost
&scope="contacts.read contacts.write"
&state=abcdefghijklmnopqrstuvwxyz123456789
&code_challenge=92d3b56942866d1edf02c33339b7c3dc37c6201282bb238cb47f0d3289f28a93f1bdd8af6ca9913aed0c4c
&code_challenge_method=S256
```
:::

The user will be asked to log in to the authorization server and approve the Client and the requested scopes.

If the user approves the Client, the authorization server redirects the user to the `redirect_uri`. The query string contains these fields:

- **code**: The authorization code. The Client exchanges it for a token in part two.
- **state**: The random string from the request. Compare it with the value that your application sent.

::: details View sample authorization_code (part 1) response
```http
HTTP/1.1 302 Found
Location: http://localhost?code=eyJhbGciOiJIUzI1NiJ9.eyJjbGllbnRfaWQiOiJhdXRoY29kZWNsaWVudCIsInJlZGlyZWN0X3VyaSI6Imh0dHA6Ly9sb2NhbGhvc3QiLCJhdXRoX2NvZGVfaWQiOiJteS1zdXBlci1zZWNyZXQtYXV0aC1jb2RlIiwic2NvcGVzIjpbXSwiZXhwaXJlX3RpbWUiOjE2MDE3NTM3MzMsImNvZGVfY2hhbGxlbmdlIjoiT0RRd1pHTTRZelpsTnpNeU1qUXlaREF4WWpFNU1XWmtZMlJrTmpKbU1UbGxNbUkwTnpJMFpEbGtNR0psWWpGbE1tTXhPV1kyWkRJMVpEZGpNak13WWciLCJjb2RlX2NoYWxsZW5nZV9tZXRob2QiOiJTMjU2In0.OIEtZN5BHNaB4Mz0plUpGAP93EHyoil2smJiG3S_2BM&state=abcdefghijklmnopqrstuvwxyz123456789
```
:::

#### Part Two

The Client sends a **POST** request to the `/token` endpoint with this body:

- **grant_type**: Set it to `authorization_code`.
- **client_id**: The identifier that you gave to the Client at registration.
- **client_secret** (optional): The secret. Send it only for a Confidential Client.
- **redirect_uri**: The same URI that part one used.
- **code_verifier**: The code verifier for the code challenge from part one.
- **code**: The authorization code from the query string.

:::warning A browser or mobile Client can leak a secret
A browser application and a native mobile application must **never** hold a `client_secret` or send one. Omit the secret when you make the `OAuthClient` entity, and also omit it from each request.
:::

::: details View sample authorization_code (part 2) request
```http
POST /token HTTP/1.1
Host: example.com
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&client_id=xxxxxxxxxx
&client_secret=xxxxxxxxxx
&redirect_uri=http://localhost
&code_verifier=OTJkM2I1Njk0Mjg2NmQxZWRmMDJjMzMzMzliN2MzZGMzN2M2MjAxMjgyYmIyMzhjYjQ3ZjBkMzI4OWYyOGE5M2YxYmRkOGFmNmNhOTkxM2FlZDBjNGM
&code=eyJhbGciOiJIUzI1NiJ9.eyJjbGllbnRfaWQiOiJhdXRoY29kZWNsaWVudCIsInJlZGlyZWN0X3VyaSI6Imh0dHA6Ly9sb2NhbGhvc3QiLCJhdXRoX2NvZGVfaWQiOiJteS1zdXBlci1zZWNyZXQtYXV0aC1jb2RlIiwic2NvcGVzIjpbXSwiZXhwaXJlX3RpbWUiOjE2MDE3NTM3MzMsImNvZGVfY2hhbGxlbmdlIjoiT0RRd1pHTTRZelpsTnpNeU1qUXlaREF4WWpFNU1XWmtZMlJrTmpKbU1UbGxNbUkwTnpJMFpEbGtNR0psWWpGbE1tTXhPV1kyWkRJMVpEZGpNak13WWciLCJjb2RlX2NoYWxsZW5nZV9tZXRob2QiOiJTMjU2In0.OIEtZN5BHNaB4Mz0plUpGAP93EHyoil2smJiG3S_2BM
```
:::

The authorization server returns this response:

- **token_type**: Always `Bearer`.
- **expires_in**: The life of the Access Token, in seconds.
- **access_token**: A signed JWT. The Client sends it to the resource server.
- **refresh_token**: A signed JWT for the [refresh token grant](./refresh_token.md).
- **scope**: The scopes of the token, separated by spaces.

::: details View sample authorization_code (part 2) response
```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=UTF-8
Cache-Control: no-store
Pragma: no-cache

{
  token_type: 'Bearer',
  expires_in: 3600,
  access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MDE3NTUxMDQsIm5iZiI6MTYwMTc1MTUwNCwiaWF0IjoxNjAxNzUxNTA0LCJqdGkiOiJuZXcgdG9rZW4iLCJjaWQiOiJ0ZXN0IGF1dGggY29kZSBjbGllbnQiLCJzY29wZSI6IiJ9.-V9x03iz-3ISRMdj9m1-FCKjmtfjvv6wqnBj6VZdW28',
  refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjbGllbnRfaWQiOiJhdXRoY29kZWNsaWVudCIsImFjY2Vzc190b2tlbl9pZCI6Im5ldyB0b2tlbiIsInJlZnJlc2hfdG9rZW5faWQiOiJ0aGlzLWlzLW15LXN1cGVyLXNlY3JldC1yZWZyZXNoLXRva2VuIiwic2NvcGUiOiIiLCJleHBpcmVfdGltZSI6MTYwMTc1NTEwNCwiaWF0IjoxNjAxNzUxNTAzfQ.J_RUFD5-158atTmI98R95vowZWi4mUEXYCO7iNwzpK4',
  scope: 'contacts.read contacts.write'
}
```
:::

### PKCE

PKCE ([RFC 7636](https://tools.ietf.org/html/rfc7636)) is an extension to the [authorization code flow](https://oauth.net/2/grant-types/authorization-code/). It prevents several attacks, and it makes the OAuth exchange safe for a Public Client.

The library enables PKCE by default, and you must use it. To support an old Client that cannot use PKCE, disable the `requiresPKCE` [configuration option](../authorization_server/configuration.md).

#### Code Verifier

The `code_verifier` prevents an attack that intercepts the authorization code.

Before [part one](#part-one) of the flow, the Client makes a `code_verifier`. This is a random string of 43 to 128 characters. Use the characters A-Z, a-z, 0-9, and the four punctuation characters `-`, `.`, `_`, and `~`.

In Node.js, use the native crypto package:

```ts
import { randomBytes } from "crypto";

const code_verifier = randomBytes(43).toString("hex");
```

@see [https://www.oauth.com/oauth2-servers/pkce/authorization-request/](https://www.oauth.com/oauth2-servers/pkce/authorization-request/)

#### Code Challenge

Next, make a `code_challenge` from the `code_verifier`.

If your device can make a SHA256 hash, use the `S256` method. The code challenge is then the SHA256 hash of the code verifier, in base64url format.

```ts
const code_challenge = base64urlencode(crypto.createHash("sha256").update(code_verifier).digest());
```

If your device cannot make a SHA256 hash, disable the `requiresS256` [configuration option](../authorization_server/configuration.md) and use the `plain` method. The code challenge is then the `code_verifier` itself.

```ts
const code_challenge = code_verifier;
```

::: details Need a base64urlencode function?
```ts
function base64urlencode(str: string) {
  return Buffer.from(str)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}
```
:::

### Revocation

A Client can use each authorization code one time only. You can also revoke an authorization code with the [`/token/revoke`](../endpoints/revoke.md) endpoint, from [RFC 7009 "OAuth 2.0 Token Revocation"](https://tools.ietf.org/html/rfc7009).

A revocation request contains these parameters:

- **token**: The authorization code that the server issued to the Client.
- **token_type_hint**: Set it to `auth_code`. The server revokes an authorization code only when the request contains this hint.

::: details View sample revoke authorization_code request
```http
POST /token/revoke HTTP/1.1
Host: example.com
Content-Type: application/x-www-form-urlencoded

token=xxxxxxxxx
&token_type_hint=auth_code
```
:::

The authorization server returns this response:

::: details View sample revoke authorization_code response
```http
HTTP/1.1 200 OK
Cache-Control: no-store
Pragma: no-cache
```
:::

## OpenID Connect ID Tokens

Set a top-level `issuer` and an `oidc` block on the authorization server to enable OIDC. Then, when the server grants the `openid` scope, the token response contains a signed ID Token with the Access Token:

```json
{
  "token_type": "Bearer",
  "expires_in": 3600,
  "access_token": "<RS256 JWT, JOSE header typ:at+jwt>",
  "refresh_token": "...",
  "scope": "openid",
  "id_token": "<RS256 JWT, JOSE header typ:JWT>"
}
```

### Claim Set

The default ID Token contains **Protocol Claims only**. The library never puts a Scope-Derived Claim, such as `name` or `email`, in the ID Token. Each Client reads those claims from the [UserInfo](../endpoints/userinfo.md) endpoint.

| Claim | Value |
| --- | --- |
| `iss` | The configured `issuer`. |
| `sub` | The canonical subject, `String(user.id)`. It is identical to the UserInfo `sub`. |
| `aud` | The **Client** identifier. This is not the resource audience of the Access Token. |
| `exp` | The expiry. It uses the life of the Access Token. |
| `iat` | The time of issue, in epoch seconds. |
| `nonce` | Present only when the authorization request contains a `nonce`. |
| `auth_time` | Present only when you set `authTime`. |
| `at_hash` | The base64url left half of `SHA-256(access_token)` (OIDC Core §3.1.3.6). |

The library does not write `azp` in v1, because `azp` is correct only while `aud` holds one Client identifier.

### Behaviour Notes

- **Scope gate:** The server returns no ID Token if it does not grant the `openid` scope.
- **Automatic scopes:** When you enable OIDC, the authorization code grant accepts the `openid`, `profile`, `email`, `address`, and `phone` scopes. You do not register them in your scope repository. The other grants, such as `client_credentials` and `password`, do not accept them, because only the authorization code flow issues an ID Token. The server does not accept `offline_access` automatically in v1.
- **Token type:** The library signs each OIDC Access Token with the JOSE header `typ: "at+jwt"` (RFC 9068), and keeps `typ: "JWT"` on each ID Token. Thus no server accepts an ID Token as an Access Token.
- **One use:** The server rejects a second request with the same authorization code, and issues no second ID Token.
