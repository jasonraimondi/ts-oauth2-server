# Progress Log

## Phase 1 — COMPLETE

### Task 1: Remove all Docusaurus files and dependencies — DONE
Deleted docs/src/, all Docusaurus config files, .docusaurus/, build/, node_modules/, old package.json.
Preserved docs/docs/ content and docs/static/ assets.

### Task 2: Initialize VitePress project — DONE
Created docs/package.json, installed VitePress 1.6.4, created .vitepress/config.mts with full config.

### Task 3: Configure navigation and sidebar — DONE
Nav: Guide + Config links. Sidebar: 6 sections (Getting Started, Authorization Server, Endpoints, Grants, Adapters, Extras) + FAQ + Upgrade Guide. Edit links configured. Root index.md with hero landing page created.

### Task 4: Migrate static assets — DONE
Moved docs/static/ → docs/public/ (favicons, logo.svg, social card, robots.txt). Deleted docs/static/.

### Task 5: Configure theme colors — DONE
Created .vitepress/theme/ with custom.css (green #2e8555 light, purple #966cf7 dark brand colors).

### Task 6: Update gitignore and verify build — DONE
Updated .gitignore for VitePress. Dev server starts successfully.

## Phase 2 — COMPLETE

### Task 1: Convert .mdx to .md and strip imports — DONE
Renamed 18 .mdx files to .md. Stripped all Docusaurus imports (@theme/*, @site/*, partial MDX).

### Task 2: Convert admonitions — DONE
Converted :::note → :::info and :::caution → :::warning across all files.

### Task 3: Convert Tabs/TabItem to code groups — DONE
Replaced all Docusaurus Tabs/TabItem with ::: code-group syntax. Inlined Installation partial (6 pkg managers). Inlined WhichGrant partial (ASCII decision tree). Fixed http request language tags to http.

### Task 4: Replace RequiredForGrants — DONE
Replaced 5 usages in repositories.md with inline markdown badge links.

### Task 5: Clean up frontmatter — DONE
Removed sidebar_position from all files. Removed empty frontmatter blocks. Fixed all .mdx link references to .md. Fixed escaped apostrophes in RFC titles.

### Task 6: Verify all internal links — DONE
Converted all <details>/<summary> HTML to VitePress ::: details containers. Build passes with zero errors and zero dead link warnings.

Next: Phase 3 — Algolia search, final polish, and cleanup.
