---
name: artifacts-builder
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
  console.log('Next steps:');
  console.log('  1. Review the changes');
  console.log('  2. Commit: git add -A && git commit -m "chore: release v' + newVersion + '"');
  console.log('  3. Tag: git tag v' + newVersion);
  console.log('  4. Push: git push && git push --tags');
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
📦 Current version: 4.1.1
🔼 Bumping version: patch
📝 New version: 4.1.2
🔍 Found 5 commits since v4.1.1
📋 Categorized commits:
   - Added: 2
   - Fixed: 3
✍️  Generated changelog entry
✅ Updated package.json
✅ Updated jsr.json
✅ Updated CHANGELOG.md

✓ Successfully prepared release v4.1.2

Next steps:
  1. Review the changes
  2. Commit: git add -A && git commit -m "chore: release v4.1.2"
  3. Tag: git tag v4.1.2
  4. Push: git push && git push --tags
```

## Integration with Project

This skill respects the project's:
- Semantic versioning (as stated in CHANGELOG.md)
- Keep a Changelog format (as shown in existing CHANGELOG.md)
- Git workflow and tagging conventions
- Dual package manager support (npm and JSR)

## Notes

- The skill does NOT automatically commit, tag, or push changes
- It prepares all files for review before manual commit
- This allows the developer to review and adjust if needed
- The skill is idempotent - can be run multiple times safely
- ALWAYS Ensure package.json and jsr.json versions are in sync before and after bumping
