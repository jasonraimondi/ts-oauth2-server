#!/bin/bash
# Hook: check-docs-updated.sh
# Runs on PreToolUse for Bash commands. Detects git commit commands and
# verifies that documentation has been updated when source files change.

set -euo pipefail

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Only intercept git commit commands
if [[ ! "$COMMAND" =~ git[[:space:]]+commit ]]; then
  exit 0
fi

STAGED_FILES=$(git diff --cached --name-only 2>/dev/null || true)

if [ -z "$STAGED_FILES" ]; then
  exit 0
fi

# Detect source code changes (library source, not tests)
SRC_CHANGES=$(echo "$STAGED_FILES" | grep -E '^src/.*\.(ts|js)$' || true)

if [ -z "$SRC_CHANGES" ]; then
  exit 0
fi

# Detect documentation changes anywhere in the repo
DOC_CHANGES=$(echo "$STAGED_FILES" | grep -E '^(docs/|README\.md|CHANGELOG\.md|CLAUDE\.md)' || true)

if [ -z "$DOC_CHANGES" ]; then
  {
    echo "Documentation check: source files are staged but no documentation files are included."
    echo ""
    echo "Modified source files:"
    echo "$SRC_CHANGES"
    echo ""
    echo "Before committing, verify whether any of these documentation locations need updates:"
    echo "  - docs/docs/         (Docusaurus site at tsoauth2server.com)"
    echo "  - README.md          (project readme)"
    echo "  - CHANGELOG.md       (version history)"
    echo ""
    echo "If documentation updates are genuinely not needed for these changes, explain"
    echo "why to the user and proceed."
  } >&2
  exit 2
fi

exit 0