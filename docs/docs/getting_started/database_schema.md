# Database Schema Reference

This page gives PostgreSQL examples for the entities. The library works with any database. Adapt the types for a different database.

The token columns store identifiers, not credentials. With the default JWT setup, the client receives a signed JWT, and the JWT carries the stored `access_token` value as its `jti` claim. The same applies to the `refresh_token` value and to the authorization `code`. You do not store the full JWT.

:::danger Security Critical

Read the [Security Considerations](#security-considerations) before you make your schema. If you do not hash your client secrets, an attacker who reads your database can authenticate as each Confidential Client.

:::

## Security Considerations

### Hash Client Secrets

**Never store a client secret as plain text.** RFC 6819 §5.1.4.1 (Credential Storage Protection) tells you to protect each stored credential. Store a bcrypt or argon2 hash in the `secret` column, for example `$2b$10$X7o4c5/QyOxCz...`.

Your `OAuthClientRepository.isClientValid()` must compare the hashes with a safe function:

```typescript
import { compare } from "bcrypt";

async isClientValid(grantType: GrantIdentifier, client: OAuthClient, clientSecret?: string): Promise<boolean> {
  if (!client.allowedGrants.includes(grantType)) {
    return false;
  }

  if (client.secret && clientSecret) {
    return compare(clientSecret, client.secret); // Secure hash comparison
  }

  return !client.secret; // Public client (no secret required)
}
```

### Hash Opaque Refresh Tokens

With the default JWT tokens, the database stores only token identifiers. An attacker who reads them cannot make a token, because the attacker cannot sign the JWT.

If you use opaque refresh tokens with a custom `RefreshTokenEncoder`, the stored value is the credential itself. Store a SHA-256 digest of each token, and make `getByRefreshToken` look the row up by the digest of the incoming value. Do not use bcrypt or argon2 here: a salted hash cannot be looked up.

### Use TLS for the Database Connection

Verify the server certificate. With PostgreSQL, set `sslmode=verify-full`. A connection that does not verify the certificate gives no protection against an attacker on the network.

---

## Recommended Schema (Normalized)

This schema uses a pivot table for each many-to-many relation, for example the scopes. The schema then gives you:

- Referential integrity
- A simple audit, for example "which Clients have the admin scope?"
- Usual SQL queries for access control

### Users Table

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- No index on email: a UNIQUE constraint already creates one. The same applies to
-- every PRIMARY KEY and UNIQUE column below, and to the leading column of a
-- composite PRIMARY KEY.
```

### Scopes Table

```sql
CREATE TABLE oauth_scopes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Clients Table

```sql
CREATE TABLE oauth_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    secret VARCHAR(255), -- NULL for public clients; MUST be hashed for confidential clients
    redirect_uris TEXT[] NOT NULL DEFAULT '{}',
    allowed_grants VARCHAR(50)[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Valid grant types: 'authorization_code', 'client_credentials', 'refresh_token',
-- 'password', 'implicit', 'urn:ietf:params:oauth:grant-type:token-exchange'
```

### Client Scopes (Pivot Table)

```sql
CREATE TABLE oauth_client_scopes (
    client_id UUID NOT NULL REFERENCES oauth_clients(id) ON DELETE CASCADE,
    scope_id UUID NOT NULL REFERENCES oauth_scopes(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (client_id, scope_id)
);

-- Indexes the reverse lookup ("which Clients have this scope?") and the cascade
-- when a scope is deleted. Postgres does not index a foreign key automatically.
CREATE INDEX idx_oauth_client_scopes_scope ON oauth_client_scopes(scope_id);
```

### Authorization Codes Table

```sql
CREATE TYPE code_challenge_method AS ENUM ('S256', 'plain');

CREATE TABLE oauth_auth_codes (
    code TEXT PRIMARY KEY,
    redirect_uri TEXT,
    code_challenge VARCHAR(255),
    code_challenge_method code_challenge_method,
    expires_at TIMESTAMPTZ NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES oauth_clients(id) ON DELETE CASCADE,
    nonce TEXT, -- OIDC: persist for an opaque authorization code
    auth_time BIGINT, -- OIDC: persist for an opaque authorization code
    max_age INTEGER, -- OIDC: authentication freshness
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ -- For revocation support
);

CREATE INDEX idx_oauth_auth_codes_client ON oauth_auth_codes(client_id);
CREATE INDEX idx_oauth_auth_codes_user ON oauth_auth_codes(user_id);
CREATE INDEX idx_oauth_auth_codes_expires ON oauth_auth_codes(expires_at);
```

### Authorization Code Scopes (Pivot Table)

```sql
CREATE TABLE oauth_auth_code_scopes (
    auth_code TEXT NOT NULL REFERENCES oauth_auth_codes(code) ON DELETE CASCADE,
    scope_id UUID NOT NULL REFERENCES oauth_scopes(id) ON DELETE CASCADE,
    PRIMARY KEY (auth_code, scope_id)
);

CREATE INDEX idx_oauth_auth_code_scopes_scope ON oauth_auth_code_scopes(scope_id);
```

### Tokens Table

```sql
CREATE TABLE oauth_tokens (
    access_token TEXT PRIMARY KEY,
    access_token_expires_at TIMESTAMPTZ NOT NULL,
    refresh_token TEXT UNIQUE,
    refresh_token_expires_at TIMESTAMPTZ,
    client_id UUID NOT NULL REFERENCES oauth_clients(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    -- No foreign key: the token must survive after you purge the authorization
    -- code row. RFC 6749 §4.1.2 uses it to revoke each descendant token when a
    -- code is redeemed twice.
    originating_auth_code_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ -- For revocation support (RFC7009)
);

CREATE INDEX idx_oauth_tokens_client ON oauth_tokens(client_id);
CREATE INDEX idx_oauth_tokens_user ON oauth_tokens(user_id);
CREATE INDEX idx_oauth_tokens_auth_code ON oauth_tokens(originating_auth_code_id);
CREATE INDEX idx_oauth_tokens_expires ON oauth_tokens(access_token_expires_at);
```

### Token Scopes (Pivot Table)

```sql
CREATE TABLE oauth_token_scopes (
    access_token TEXT NOT NULL REFERENCES oauth_tokens(access_token) ON DELETE CASCADE,
    scope_id UUID NOT NULL REFERENCES oauth_scopes(id) ON DELETE CASCADE,
    PRIMARY KEY (access_token, scope_id)
);

CREATE INDEX idx_oauth_token_scopes_scope ON oauth_token_scopes(scope_id);
```

---

## Alternative: Simplified Schema (Array-Based)

In a simple deployment, you can store the scopes as an array on each entity. This gives you fewer tables, but you lose the referential integrity.

:::warning Consequences

- No foreign key validates a scope name. An incorrect name causes no error.
- It is more difficult to find all the Clients with one scope.
- The database does not delete a scope from an entity when you delete that scope.

:::

```sql
-- Users table (same as normalized schema)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Enum for PKCE (same as normalized schema)
CREATE TYPE code_challenge_method AS ENUM ('S256', 'plain');

-- Scopes stored as TEXT[] instead of pivot tables
CREATE TABLE oauth_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    secret VARCHAR(255),
    redirect_uris TEXT[] NOT NULL DEFAULT '{}',
    allowed_grants VARCHAR(50)[] NOT NULL DEFAULT '{}',
    scopes TEXT[] NOT NULL DEFAULT '{}', -- Array instead of pivot table
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE TABLE oauth_auth_codes (
    code TEXT PRIMARY KEY,
    redirect_uri TEXT,
    code_challenge VARCHAR(255),
    code_challenge_method code_challenge_method,
    expires_at TIMESTAMPTZ NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES oauth_clients(id) ON DELETE CASCADE,
    scopes TEXT[] NOT NULL DEFAULT '{}', -- Array instead of pivot table
    nonce TEXT, -- OIDC: persist for an opaque authorization code
    auth_time BIGINT, -- OIDC: persist for an opaque authorization code
    max_age INTEGER, -- OIDC: authentication freshness
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

CREATE TABLE oauth_tokens (
    access_token TEXT PRIMARY KEY,
    access_token_expires_at TIMESTAMPTZ NOT NULL,
    refresh_token TEXT UNIQUE,
    refresh_token_expires_at TIMESTAMPTZ,
    client_id UUID NOT NULL REFERENCES oauth_clients(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    scopes TEXT[] NOT NULL DEFAULT '{}', -- Array instead of pivot table
    originating_auth_code_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

-- Query scopes using ANY()
-- Example: SELECT * FROM oauth_clients WHERE 'admin' = ANY(scopes);
```

---

## Token Revocation Queries (RFC7009)

Both schemas above include the `revoked_at` column. Map each query to its repository method:

```sql
-- getByAccessToken / getByRefreshToken: a plain lookup, with no revocation filter
SELECT * FROM oauth_tokens
WHERE access_token = $1;

-- isAccessTokenRevoked / isRefreshTokenRevoked: report the flag
SELECT revoked_at IS NOT NULL FROM oauth_tokens
WHERE access_token = $1;

-- revoke: set the flag (RFC7009, the /token/revoke endpoint)
UPDATE oauth_tokens
SET revoked_at = NOW()
WHERE access_token = $1;

-- revokeDescendantsOf: revoke all tokens from one auth code (RFC6749 §4.1.2)
UPDATE oauth_tokens
SET revoked_at = NOW()
WHERE originating_auth_code_id = $1;
```

Keep the revocation check in `isAccessTokenRevoked` and `isRefreshTokenRevoked`, not in the `getBy` lookups. A lookup that filters out the revoked rows makes a revoked token and a deleted token look the same.

---

## Existing Examples

These two projects use an ORM:

- **Prisma schema**: [example/prisma/schema.prisma](https://github.com/jasonraimondi/ts-oauth2-server/blob/main/example/prisma/schema.prisma)
- **Drizzle schema**: [ts-oauth2-server-example](https://github.com/jasonraimondi/ts-oauth2-server-example), a full example application with a [Drizzle schema](https://github.com/jasonraimondi/ts-oauth2-server-example/blob/main/src/db/schema.ts) and its [migrations](https://github.com/jasonraimondi/ts-oauth2-server-example/tree/main/drizzle)

---

## Check Your Schema

Make these four checks after you create your schema:

| Check | Procedure |
|-------|---------------|
| The secrets are hashed | `SELECT secret FROM oauth_clients` shows a hash. Each hash starts with `$2a$`, `$2b$`, or `$2y$` for bcrypt, or `$argon2` for argon2 |
| The referential integrity is correct | Delete a Client. The database also deletes its tokens and its authorization codes |
| The expiry column has an index | `EXPLAIN` shows that a query on the expiry uses the index |
| The revocation operates | Your repository reports a revoked token as revoked |