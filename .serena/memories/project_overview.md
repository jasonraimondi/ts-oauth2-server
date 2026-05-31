# Project overview

`@jmondi/oauth2-server` is a TypeScript OAuth 2.0 authorization server library. The core is framework-agnostic and adapters are exported for vanilla, Express, Fastify, and H3. It implements grant flows via `AbstractGrant` subclasses and uses repository interfaces for consumer-provided persistence.

Key architecture:
- `AuthorizationServer` orchestrates flows and endpoint methods.
- Grants live in `src/grants/` (`authorization_code`, `client_credentials`, `password`, `implicit`, `refresh_token`, `token_exchange`).
- Persistence boundaries live in `src/repositories/`; consumers implement repositories.
- Protocol/data entities live in `src/entities/`; requests/responses in `src/requests/` and `src/responses/`.
- Adapters live in `src/adapters/`; utilities in `src/utils/`; PKCE verifiers in `src/code_verifiers/`.
- OIDC support lives in `src/oidc/` and is opt-in via `AuthorizationServerOptions` `issuer` plus nested `oidc` block.