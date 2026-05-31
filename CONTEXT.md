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

### Roles

**Client**:
A registered application requesting tokens. In OIDC contexts this is also called the "Relying Party (RP)" — same entity.
_Avoid_: introducing "Relying Party" as if it were a separate concept; it is the OIDC name for **Client**.

**Issuer**:
The authorization server's identity — a single URL that is simultaneously the `iss` claim value, the Discovery `issuer`, and the base path of the Discovery Document. Mandatory when OIDC is enabled.

## Relationships

- A **Client** completes the authorization code flow to obtain an **Access Token**, plus an **ID Token** when the `openid` scope is granted.
- An **ID Token** carries only **Protocol Claims**; **Scope-Derived Claims** are obtained separately from **UserInfo**.
- **UserInfo** trusts an **Access Token**; the **Claims Resolver** supplies the attributes it returns.
- The **JWKS** publishes the public half of the one keypair that signs every **Access Token** and **ID Token**.

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
