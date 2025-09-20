# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands and Guidelines for ts-oauth2-server

### Build/Test/Format Commands
- `pnpm build` - Clean and build the project
- `pnpm test` - Run all tests with Vitest
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:cov` - Run tests with coverage
- `pnpm vitest run path/to/test/file.spec.ts` - Run a single test file
- `pnpm format` - Format code with Prettier

### Code Style Guidelines
- **TypeScript**: Use strict mode with no implicit any, strict null checks
- **Imports**: Use `.js` extension in import paths
- **Formatting**: Follow Prettier defaults (package uses Prettier v3.x)
- **Naming**:
  - Files: snake_case.ts
  - Classes: PascalCase
  - Functions/variables: camelCase
- **Error Handling**: Use custom OAuthException with specific error types
- **Types**:
  - Always use explicit types for function parameters and returns
  - Avoid `any` - use proper typing or generics
- **Tests**: Write tests using Vitest with describe/it structure
- **Architecture**: Follow repository pattern for data access

### Breaking Changes Policy
- **CRITICAL**: Avoid breaking changes at all costs - this is a published library used by many consumers
- Never change existing public APIs, method signatures, or exported interfaces
- Always add new functionality as optional parameters with sensible defaults
- Use deprecation warnings for any planned removals (but prefer keeping deprecated code)
- Consider backwards-compatible alternatives before making any interface changes
- When in doubt, extend rather than modify existing functionality

### Documentation Requirements
- **Always update documentation** when adding new functionality or changing behavior
- Update the main documentation site at https://tsoauth2server.com/ for user-facing changes
- Update this CLAUDE.md file if architectural patterns or development practices change
- Ensure code examples in documentation remain current and functional
- Document new configuration options, interfaces, or breaking changes thoroughly

### Architecture Overview

This is a TypeScript OAuth 2.0 authorization server library. The core architecture consists of:

- **AuthorizationServer**: Main entry point that orchestrates OAuth flows
- **Grants**: Implement specific OAuth grant types (auth_code, client_credentials, etc.)
- **Repositories**: Abstract data access layer (client, token, user, scope, auth_code)
- **Entities**: Core domain objects (OAuthClient, OAuthToken, OAuthUser, etc.)
- **Adapters**: Framework-specific helpers (Express, Fastify, Vanilla)
- **Code Verifiers**: PKCE implementation (Plain, S256)

#### Key Components:
- **Grant System**: Each grant type (authorization_code, client_credentials, password, implicit, refresh_token, token_exchange) is implemented as a separate class inheriting from AbstractGrant
- **Repository Pattern**: All data persistence is abstracted through repository interfaces that must be implemented by consumers
- **Framework Agnostic**: Core library is framework-independent with optional adapters for popular frameworks
- **Standards Compliance**: Implements multiple OAuth 2.0 RFCs (6749, 6750, 7009, 7519, 7636, 7662, 8693)

#### Module Exports:
The library supports multiple entry points via package.json exports:
- Main: `./src/index.ts` (all exports)
- Framework adapters: `./vanilla`, `./express`, `./fastify`

#### Testing Structure:
- Unit tests: `test/unit/`
- E2E tests: `test/e2e/` (organized by grants and adapters)
- Test setup: `test/setup.ts`
- Coverage excludes: `.github`, `.idea`, `docs`, `example`
