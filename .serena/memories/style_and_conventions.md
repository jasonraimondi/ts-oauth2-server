# Style and conventions

- TypeScript strict mode; prefer explicit parameter and return types.
- Avoid `any`.
- Use named imports/exports only; no default exports and no barrels.
- Relative imports include `.js` extensions.
- File names are `snake_case.ts`; classes are `PascalCase`; variables/functions are `camelCase`.
- Errors should be thrown as `OAuthException` with specific OAuth error types.
- Tests use Vitest `describe`/`it`.
- Published library: avoid breaking public APIs/signatures/interfaces. Add optional params with defaults; extend rather than modify; prefer keeping deprecated code over removal.
- Update docs/CLAUDE.md when behavior or architecture changes.