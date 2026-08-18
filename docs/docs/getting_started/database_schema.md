# Database Schema Reference

This page gives SQL examples for the entities. The library works with any database, but most projects use a relational database.

:::danger Security Critical

Read the [Security Considerations](#security-considerations) before you make your schema. If you do not hash your secrets and your tokens, an attacker who reads your database gets full access.

:::

## Security Considerations

### Hash Client Secrets

**Never store a client secret as plain text.** RFC 6749 §2.3.1 tells you to protect the client credentials.

```sql
-- The 'secret' column should contain a bcrypt/argon2 hash, NOT the raw secret
-- Example hash: $2b$10$X7o4c5/QyOxCz...
```

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

### Hash the Refresh Tokens

A Refresh Token has a long life. If an attacker reads your database and finds a plain text Refresh Token, that attacker can make a new Access Token at any time.

Store a hash of each Refresh Token. Compare the hashes with a constant-time function when you validate the token.

### Use TLS for the Database Connection

In production, always encrypt the connection between your application and your database with TLS.

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

CREATE INDEX idx_users_email ON users(email);
```

### Scopes Table

```sql
CREATE TABLE oauth_scopes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_oauth_scopes_name ON oauth_scopes(name);
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

CREATE INDEX idx_oauth_client_scopes_client ON oauth_client_scopes(client_id);
CREATE INDEX idx_oauth_client_scopes_scope ON oauth_client_scopes(scope_id);
```

### Authorization Codes Table

```sql
CREATE TYPE code_challenge_method AS ENUM ('S256', 'plain');

CREATE TABLE oauth_auth_codes (
    code VARCHAR(255) PRIMARY KEY,
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
    auth_code VARCHAR(255) NOT NULL REFERENCES oauth_auth_codes(code) ON DELETE CASCADE,
    scope_id UUID NOT NULL REFERENCES oauth_scopes(id) ON DELETE CASCADE,
    PRIMARY KEY (auth_code, scope_id)
);

CREATE INDEX idx_oauth_auth_code_scopes_code ON oauth_auth_code_scopes(auth_code);
```

### Tokens Table

```sql
CREATE TABLE oauth_tokens (
    access_token VARCHAR(255) PRIMARY KEY,
    access_token_expires_at TIMESTAMPTZ NOT NULL,
    refresh_token VARCHAR(255) UNIQUE,
    refresh_token_expires_at TIMESTAMPTZ,
    client_id UUID NOT NULL REFERENCES oauth_clients(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    originating_auth_code_id VARCHAR(255), -- For RFC6749 §4.1.2 compliance
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ -- For revocation support (RFC7009)
);

CREATE INDEX idx_oauth_tokens_access_token ON oauth_tokens(access_token);
CREATE INDEX idx_oauth_tokens_refresh_token ON oauth_tokens(refresh_token);
CREATE INDEX idx_oauth_tokens_client ON oauth_tokens(client_id);
CREATE INDEX idx_oauth_tokens_user ON oauth_tokens(user_id);
CREATE INDEX idx_oauth_tokens_auth_code ON oauth_tokens(originating_auth_code_id);
CREATE INDEX idx_oauth_tokens_expires ON oauth_tokens(access_token_expires_at);
```

### Token Scopes (Pivot Table)

```sql
CREATE TABLE oauth_token_scopes (
    access_token VARCHAR(255) NOT NULL REFERENCES oauth_tokens(access_token) ON DELETE CASCADE,
    scope_id UUID NOT NULL REFERENCES oauth_scopes(id) ON DELETE CASCADE,
    PRIMARY KEY (access_token, scope_id)
);

CREATE INDEX idx_oauth_token_scopes_token ON oauth_token_scopes(access_token);
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
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE oauth_auth_codes (
    code VARCHAR(255) PRIMARY KEY,
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
    access_token VARCHAR(255) PRIMARY KEY,
    access_token_expires_at TIMESTAMPTZ NOT NULL,
    refresh_token VARCHAR(255) UNIQUE,
    refresh_token_expires_at TIMESTAMPTZ,
    client_id UUID NOT NULL REFERENCES oauth_clients(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    scopes TEXT[] NOT NULL DEFAULT '{}', -- Array instead of pivot table
    originating_auth_code_id VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

-- Query scopes using ANY()
-- Example: SELECT * FROM oauth_clients WHERE 'admin' = ANY(scopes);
```

---

## Token Revocation Support (RFC7009)

Add a `revoked_at` timestamp column for the [`/token/revoke`](../endpoints/revoke.md) endpoint:

```sql
-- Check if token is revoked in your repository
SELECT * FROM oauth_tokens
WHERE access_token = $1
  AND revoked_at IS NULL;

-- Revoke a token
UPDATE oauth_tokens
SET revoked_at = NOW()
WHERE access_token = $1;

-- Revoke all tokens from an auth code (RFC6749 §4.1.2)
UPDATE oauth_tokens
SET revoked_at = NOW()
WHERE originating_auth_code_id = $1;
```

---

## Existing Examples

These two projects use an ORM:

- **Prisma schema**: [example/prisma/schema.prisma](https://github.com/jasonraimondi/ts-oauth2-server/blob/main/example/prisma/schema.prisma)
- **Full example application**: [ts-oauth2-server-example](https://github.com/jasonraimondi/ts-oauth2-server-example), with a Prisma schema and the migrations

---

## Check Your Schema

Make these four checks after you create your schema:

| Check | Procedure |
|-------|---------------|
| The secrets are hashed | `SELECT secret FROM oauth_clients` shows a hash. Each hash starts with `$2b$` for bcrypt, or `$argon2` for argon2 |
| The referential integrity is correct | Delete a Client. The database also deletes its tokens and its authorization codes |
| The expiry column has an index | `EXPLAIN` shows that a query on the expiry uses the index |
| The revocation operates | Your repository reports a revoked token as revoked |