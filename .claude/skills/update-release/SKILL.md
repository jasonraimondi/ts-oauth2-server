---
name: update-release
description: Automates the release process for the ts-oauth2-server project.
license: Complete terms in LICENSE
---

# Release Creator Skill

## Purpose
Automates the release process for the ts-oauth2-server project by:
1. Bumping version numbers in both `package.json` and `jsr.json`
2. Generating changelog entries based on git commits since the last tagged version
3. Updating the CHANGELOG.md file with proper formatting
4. Maintaining Keep a Changelog format and Semantic Versioning compliance
5. Pausing for user confirmation, then committing, tagging, pushing, and creating the GitHub release (which triggers npm + JSR publish via `.github/workflows/publish.yml`)

## When to Use This Skill
Use this skill when the user requests:
- Creating a new release
- Bumping the version (patch, minor, major, premajor, preminor, prepatch, prerelease)
- Updating the changelog
- Preparing for a release
- Publishing a new version

## Prerequisites
- Git repository with commit history
- Existing tags for version tracking
- `package.json` and `jsr.json` files present
- `CHANGELOG.md` file exists

## Core Functionality

### Version Bump Types
Supported version bump types (following semver):
- **patch**: Bug fixes (1.0.0 → 1.0.1)
- **minor**: New features (1.0.0 → 1.1.0)
- **major**: Breaking changes (1.0.0 → 2.0.0)
- **prepatch**: Pre-release patch (1.0.0 → 1.0.1-0)
- **preminor**: Pre-release minor (1.0.0 → 1.1.0-0)
- **premajor**: Pre-release major (1.0.0 → 2.0.0-0)
- **prerelease**: Increment pre-release (1.0.0-0 → 1.0.0-1)

### Implementation Steps

#### 1. Get Current Version
```typescript
import { readFileSync } from 'fs';

function getCurrentVersion(): string {
  const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
  return pkg.version;
}
```

#### 2. Calculate New Version
```typescript
function bumpVersion(current: string, bumpType: string): string {
  const parts = current.split('-');
  const [major, minor, patch] = parts[0].split('.').map(Number);
  const prerelease = parts[1];
  
  switch (bumpType) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    case 'premajor':
      return `${major + 1}.0.0-0`;
    case 'preminor':
      return `${major}.${minor + 1}.0-0`;
    case 'prepatch':
      return `${major}.${minor}.${patch + 1}-0`;
    case 'prerelease':
      if (prerelease) {
        const num = parseInt(prerelease) || 0;
        return `${parts[0]}-${num + 1}`;
      }
      return `${major}.${minor}.${patch + 1}-0`;
    default:
      throw new Error(`Invalid bump type: ${bumpType}`);
  }
}
```

#### 3. Get Git Commits Since Last Tag
```bash
# Get the last tag
last_tag=$(git describe --tags --abbrev=0 2>/dev/null || echo "")

# Get commits since last tag
if [ -z "$last_tag" ]; then
  # No previous tag, get all commits
  commits=$(git log --pretty=format:"%s" --no-merges)
else
  # Get commits since last tag
  commits=$(git log ${last_tag}..HEAD --pretty=format:"%s" --no-merges)
fi
```

#### 4. Categorize Commits
Parse commits and categorize them based on conventional commit format:
- `feat:` or `feature:` → Added section
- `fix:` → Fixed section
- `BREAKING CHANGE:` or `!:` → Changed section (breaking)
- `docs:` → Skip (or note in documentation)
- `chore:`, `refactor:`, `test:` → Skip or group under "Changed"
- `security:` → Security section

#### 5. Generate Changelog Entry
Follow Keep a Changelog format:
```markdown
## [Version] - YYYY-MM-DD

### Added
- New feature A
- New feature B

### Changed
- **BREAKING**: Changed behavior X
- Updated Y

### Fixed
- Fixed bug in Z
- Resolved issue with W

### Security
- Security fix for vulnerability V
```

#### 6. Update Files
Update both `package.json` and `jsr.json` with the new version, and prepend the new changelog entry to CHANGELOG.md under the `## [Unreleased]` section.

#### 7. Confirm With User, Then Commit + Tag + Push + GitHub Release
After the file edits land, **stop and ask the user** for confirmation before any git mutation. Do NOT proceed automatically — the user may want to review the diff or hand-edit changelog wording first.

Once confirmed, run these in order:

```bash
# 1. Commit the version bump + changelog
git add CHANGELOG.md package.json jsr.json
git commit -m "chore: release vX.Y.Z"

# 2. Tag and push (tag push alone does NOT trigger publish)
git tag vX.Y.Z
git push && git push --tags

# 3. Create GitHub release — THIS is what triggers .github/workflows/publish.yml
#    (workflow listens on `release: [released, prereleased]`, not on tag push)
gh release create vX.Y.Z --title "vX.Y.Z" --notes "<changelog body for this version>"
```

For the `--notes` body, pass the section content from CHANGELOG.md for the new version (everything between the `## [X.Y.Z]` header and the next `##` header), without the version header itself. Use a HEREDOC for multiline notes.

For prereleases (e.g. `4.4.0-0`), add `--prerelease` to `gh release create` so the workflow's prerelease branch publishes to npm under the `next` dist-tag.

After `gh release create` returns the release URL, share it with the user and note that npm + JSR publishing is now running in CI.

## Usage Examples

### Example 1: Patch Release
```typescript
// User request: "Create a patch release"
const currentVersion = "4.1.1";
const newVersion = "4.1.2";

// 1. Get commits since v4.1.1
// 2. Categorize commits
// 3. Generate changelog entry
// 4. Update package.json, jsr.json, CHANGELOG.md
```

### Example 2: Minor Release with Features
```typescript
// User request: "Bump minor version and update changelog"
const currentVersion = "4.1.1";
const newVersion = "4.2.0";

// Changelog generated from commits:
// - feat: Add new grant type support
// - feat: Enhance token validation
// - fix: Resolve refresh token issue
```

### Example 3: Major Release with Breaking Changes
```typescript
// User request: "Create major release for breaking changes"
const currentVersion = "4.1.1";
const newVersion = "5.0.0";

// Identify BREAKING CHANGE commits
// Place them under ### Changed section
```

## Implementation Script

Here's a complete implementation approach:

```typescript
interface ChangelogEntry {
  added: string[];
  changed: string[];
  deprecated: string[];
  removed: string[];
  fixed: string[];
  security: string[];
}

async function createRelease(bumpType: string): Promise<void> {
  // 1. Read current version
  const currentVersion = getCurrentVersion();
  console.log(`Current version: ${currentVersion}`);
  
  // 2. Calculate new version
  const newVersion = bumpVersion(currentVersion, bumpType);
  console.log(`New version: ${newVersion}`);
  
  // 3. Get last tag and commits
  const lastTag = await getLastTag();
  const commits = await getCommitsSinceTag(lastTag);
  console.log(`Found ${commits.length} commits since ${lastTag || 'beginning'}`);
  
  // 4. Parse and categorize commits
  const changelog = categorizeCommits(commits);
  
  // 5. Generate changelog entry
  const changelogEntry = generateChangelogEntry(newVersion, changelog);
  console.log('Generated changelog entry');
  
  // 6. Update files
  await updatePackageJson(newVersion);
  await updateJsrJson(newVersion);
  await updateChangelog(changelogEntry);
  
  console.log(`✓ Successfully prepared release ${newVersion}`);
  console.log('Next: ask user to confirm, then commit + tag + push + `gh release create`.');
  console.log('The GitHub release event triggers .github/workflows/publish.yml (npm + JSR).');
}

function categorizeCommits(commits: string[]): ChangelogEntry {
  const entry: ChangelogEntry = {
    added: [],
    changed: [],
    deprecated: [],
    removed: [],
    fixed: [],
    security: [],
  };
  
  for (const commit of commits) {
    const lower = commit.toLowerCase();
    
    if (lower.includes('breaking change') || lower.includes('!:')) {
      entry.changed.push(commit.replace(/^[^:]+:\s*/, ''));
    } else if (lower.startsWith('feat:') || lower.startsWith('feature:')) {
      entry.added.push(commit.replace(/^[^:]+:\s*/, ''));
    } else if (lower.startsWith('fix:')) {
      entry.fixed.push(commit.replace(/^[^:]+:\s*/, ''));
    } else if (lower.startsWith('security:')) {
      entry.security.push(commit.replace(/^[^:]+:\s*/, ''));
    } else if (lower.startsWith('deprecate:')) {
      entry.deprecated.push(commit.replace(/^[^:]+:\s*/, ''));
    } else if (lower.startsWith('remove:')) {
      entry.removed.push(commit.replace(/^[^:]+:\s*/, ''));
    }
    // Skip chore, docs, test, refactor, style, etc.
  }
  
  return entry;
}

function generateChangelogEntry(version: string, changelog: ChangelogEntry): string {
  const date = new Date().toISOString().split('T')[0];
  let entry = `## [${version}] - ${date}\n\n`;
  
  if (changelog.added.length > 0) {
    entry += '### Added\n';
    for (const item of changelog.added) {
      entry += `- ${item}\n`;
    }
    entry += '\n';
  }
  
  if (changelog.changed.length > 0) {
    entry += '### Changed\n';
    for (const item of changelog.changed) {
      entry += `- ${item}\n`;
    }
    entry += '\n';
  }
  
  if (changelog.deprecated.length > 0) {
    entry += '### Deprecated\n';
    for (const item of changelog.deprecated) {
      entry += `- ${item}\n`;
    }
    entry += '\n';
  }
  
  if (changelog.removed.length > 0) {
    entry += '### Removed\n';
    for (const item of changelog.removed) {
      entry += `- ${item}\n`;
    }
    entry += '\n';
  }
  
  if (changelog.fixed.length > 0) {
    entry += '### Fixed\n';
    for (const item of changelog.fixed) {
      entry += `- ${item}\n`;
    }
    entry += '\n';
  }
  
  if (changelog.security.length > 0) {
    entry += '### Security\n';
    for (const item of changelog.security) {
      entry += `- ${item}\n`;
    }
    entry += '\n';
  }
  
  return entry;
}
```

## Best Practices

1. **Always verify versions match**: Ensure package.json and jsr.json versions are in sync before and after bumping
2. **Review commits carefully**: Not all commits should appear in changelog
3. **Use conventional commits**: Encourage the team to use conventional commit format
4. **Breaking changes**: Always highlight breaking changes prominently
5. **Date format**: Use ISO date format (YYYY-MM-DD) for consistency
6. **Manual review**: Always review generated changelog before committing

## Error Handling

- **No git repository**: Warn user and exit gracefully
- **Uncommitted changes**: Warn user to commit or stash changes first
- **Invalid bump type**: Show available options and exit
- **Version mismatch**: If package.json and jsr.json versions don't match, warn user
- **No commits**: If no commits since last tag, warn user and ask if they want to proceed

## Output Format

The skill should provide clear feedback:
```
Current version: 4.1.1
Bumping version: patch
New version: 4.1.2
Found 5 commits since v4.1.1
Updated package.json, jsr.json, CHANGELOG.md

Files prepared for v4.1.2.

Confirm to proceed with: commit + tag + push + GitHub release
(GitHub release triggers npm + JSR publish via .github/workflows/publish.yml)
```

After user confirmation, run the git+gh commands and report the release URL.

## Integration with Project

This skill respects the project's:
- Semantic versioning (as stated in CHANGELOG.md)
- Keep a Changelog format (as shown in existing CHANGELOG.md)
- Git workflow and tagging conventions
- Dual package manager support (npm and JSR)

## Notes

- The skill prepares the file edits, then **pauses for explicit user confirmation** before any git mutation
- After confirmation, it runs commit + tag + push + `gh release create` in sequence — the GitHub release is what triggers `.github/workflows/publish.yml` to publish to npm and JSR (a tag push alone does NOT trigger publish)
- The skill is idempotent up to the confirmation gate — re-running before confirming is safe; after the tag is pushed, version bumps require a new patch
- ALWAYS ensure package.json and jsr.json versions are in sync before and after bumping
