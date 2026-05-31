# Task completion checklist

Before considering a code task complete:
- Run focused tests for touched behavior (`pnpm vitest run ...`).
- Run broader validation when appropriate: `pnpm test` and `pnpm build`.
- Run `pnpm format` if formatting may have changed.
- Check `git status` and review `git diff`.
- Ensure public API compatibility for this published library.
- For OIDC/OAuth changes, verify relevant RFC/OIDC semantics and update docs if behavior or architecture changed.