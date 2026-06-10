# ts-oauth2-server

A framework-agnostic TypeScript library implementing an OAuth 2.0 authorization server, with an OpenID Connect (OIDC) layer built on top of the authorization code grant.

## Language

### Tokens

**Access Token**:
A JWT granting a bearer access to protected resources. When the request supplies an `audience` parameter, that becomes the token's `aud` (the *resource* audience); with no `audience` requested, the token carries no `aud` claim.
_Avoid_: "bearer token" when you mean the access token specifically.

**ID Token**:
A JWT asserting that an end-user authenticated, returned only when the `openid` scope is granted. Its `aud` claim is the *client* — deliberately different from an Access Token's `aud`.
_Avoid_: conflating with Access Token; they have different audiences and purposes.

**Refresh Token**:
A token used to obtain a new Access Token. In v1 the refresh flow is OIDC-unaware — it never returns an ID Token.

**Active**:
The state introspection reports for a token: its persisted record exists, the stored expiry is in the future, and it has not been revoked. Determined entirely from the server's own records — never from the presented token's claims, which a token can only be trusted to carry after its signature verifies.
_Avoid_: equating "active" with "the JWT's `exp` hasn't passed"; the server's stored state is the truth.

### Claims

**Protocol Claims**:
The fixed claim set the library itself puts in an ID Token (`iss`, `sub`, `aud`, `exp`, `iat`, and conditionally `nonce`, `auth_time`, `at_hash`). The consumer cannot override these.

**Scope-Derived Claims**:
User attributes (`name`, `email`, …) authorized by the granted scopes per the OIDC standard scope→claim mapping. Served **only** from the UserInfo endpoint, never in a default ID Token.

**Claims Resolver**:
The consumer-supplied `getUserClaims` callback that returns a user's attributes. The library filters its output down to what the granted scopes authorize.

### Endpoints & documents

**UserInfo**:
The endpoint that returns Scope-Derived Claims for a presented Access Token. Requires the token to carry the `openid` scope.

**Discovery Document**:
The `.well-known/openid-configuration` JSON describing the server's OIDC capabilities and endpoint URLs.

**JWKS**:
The published set of public keys (`{ keys: [...] }`) relying parties use to verify token signatures.

**Token Type Hint**:
The optional `token_type_hint` parameter a client may send to introspection/revocation. Purely advisory: the server identifies the token's type from the token itself and must locate tokens of any supported type even when the hint is absent or wrong (RFC 7009 §2.1). An unrecognized hint is still rejected outright.
_Avoid_: treating the hint as a dispatch key that gates which lookups run.

### Redirect URIs

**Registered Redirect URI**:
A callback URI a **Client** declares at registration — the only destinations the server will ever redirect to. When a Client has more than one, every authorization request must name which one it wants.

**Loopback Redirect URI**:
A redirect URI whose host is `localhost`, `127.0.0.1`, or `[::1]`. The only class of redirect URI whose port may differ between registration and request (RFC 8252 §7.3, native apps binding ephemeral ports). The host itself must still match exactly — `localhost` and `127.0.0.1` are not interchangeable.

**Exact Matching**:
The rule for comparing a requested redirect URI against a Registered Redirect URI: the two must be the same URI (after syntax normalization, RFC 3986 §6.2.2) — never a host, path, port, or query variant, and never a prefix. Sole exception: the port of a **Loopback Redirect URI**.
_Avoid_: "prefix matching", "ignoring port", "partial matching" — none of these exist here.

### Roles

**Client**:
A registered application requesting tokens. In OIDC contexts this is also called the "Relying Party (RP)" — same entity.
_Avoid_: introducing "Relying Party" as if it were a separate concept; it is the OIDC name for **Client**.

**Confidential Client**:
A **Client** whose registered entity carries a secret (`isClientConfidential` ⇔ `!!client.secret`). Only confidential clients may introspect by default (RFC 7662 §4).
_Avoid_: "secure client", "trusted client" — say Confidential Client.

**Public Client**:
A **Client** registered without a secret (e.g. a browser SPA using PKCE). May obtain and revoke its own tokens, but is rejected from introspection unless `introspectionRequiresConfidentialClient` is disabled.
_Avoid_: "insecure client", "secretless client".

**Issuer**:
The authorization server's identity — a single URL that is simultaneously the `iss` claim value, the Discovery `issuer`, and the base path of the Discovery Document. Mandatory when OIDC is enabled.

## Relationships

- A **Client** is either a **Confidential Client** or a **Public Client**, determined by whether its registration carries a secret.
- A **Client** completes the authorization code flow to obtain an **Access Token**, plus an **ID Token** when the `openid` scope is granted.
- An **ID Token** carries only **Protocol Claims**; **Scope-Derived Claims** are obtained separately from **UserInfo**.
- **UserInfo** trusts an **Access Token**; the **Claims Resolver** supplies the attributes it returns.
- The **JWKS** publishes the public half of the one keypair that signs every **Access Token** and **ID Token**.
- An authorization request's redirect URI must satisfy **Exact Matching** against one of the **Client**'s **Registered Redirect URIs**; omitting it is allowed only when exactly one is registered.

## Example dialogue

> **Dev:** "The client wants the user's email — do we put it in the ID Token?"
> **Domain expert:** "No. Email is a Scope-Derived Claim. The default ID Token is lean — only Protocol Claims. The client reads email from UserInfo. If a team really wants email inside the ID Token, that's what the `getIdTokenClaims` hook is for — but it's never there by default."
>
> **Dev:** "And the ID Token's `aud` — same as the access token's?"
> **Domain expert:** "No. The ID Token's audience is the Client. The Access Token's audience is the resource server. Different claims, different values."

## Flagged ambiguities

- "claims" was used for both the fixed ID-token set and the scope-gated user attributes — resolved into distinct terms: **Protocol Claims** vs **Scope-Derived Claims**.
- "Relying Party" / "RP" is not a separate concept — it is the OIDC name for **Client**.
- "audience" / `aud` means different things on an Access Token (resource) vs an ID Token (client) — always qualify which token.
- "secure client" / "insecure client" were used for the secret-presence distinction — resolved into **Confidential Client** vs **Public Client**.
- "matching" a redirect URI historically meant ignoring port and query for every host (and tests asserted it as a feature) — resolved to **Exact Matching**, with port flexibility owned exclusively by the **Loopback Redirect URI** concept.
