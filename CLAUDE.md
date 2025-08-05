# Commands and Guidelines for ts-oauth2-server

## Build/Test/Format Commands
- `pnpm build` - Clean and build the project
- `pnpm test` - Run all tests with Vitest
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:cov` - Run tests with coverage
- `pnpm vitest run path/to/test/file.spec.ts` - Run a single test file
- `pnpm format` - Format code with Prettier

## Code Style Guidelines
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