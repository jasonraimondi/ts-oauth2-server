# Research: Docusaurus → VitePress Migration

## Docusaurus-specific patterns found in content

### 1. Imports to strip (19 files)

Every `.mdx` file has one or more of these at the top:

```
import Tabs from "@theme/Tabs";
import TabItem from "@theme/TabItem";
import CodeBlock from "@theme/CodeBlock";
import RequiredForGrants from "@site/src/components/grants/RequiredForGrants";
import Installation from "../../src/pages/_index_install.mdx";
```

All must be removed. VitePress markdown files cannot have JS imports.

### 2. Admonition syntax mapping

Docusaurus and VitePress both use `:::` fences but the type names differ slightly.

| Docusaurus | VitePress | Notes |
|---|---|---|
| `:::note` | `:::info` | VitePress has no "note" type |
| `:::info` | `:::info` | Direct match |
| `:::tip` | `:::tip` | Direct match |
| `:::warning` | `:::warning` | Direct match |
| `:::danger` | `:::danger` | Direct match |
| `:::caution` | `:::warning` | VitePress has no "caution" type |

**Title syntax difference:**
- Docusaurus: `:::info Important` (space after type)
- VitePress: `::: info Important` (space after `:::` and before type — both work, but VitePress also accepts no space)

Admonitions appear in 21 files. Most are simple single-type blocks. A few have custom titles:
- `:::info Important` in protecting_resources.mdx
- `:::danger Security Critical` in database_schema.md
- `:::warning Tradeoffs` in database_schema.md
- `:::note Supports the following RFC'S` in revoke.mdx, introspect.mdx, authorize.mdx, token.mdx
- `:::note Enable this grant` in authorization_code.mdx, token_exchange.mdx, custom.mdx, password.mdx
- `:::warning Not Recommended` in implicit.mdx
- `:::tip Database Schema Examples` in repositories.mdx
- `:::warning Private Key Leak Potential` in authorization_code.mdx

### 3. Tabs/TabItem → VitePress code groups

7 files use `<Tabs>`/`<TabItem>`. Two distinct patterns:

**Pattern A: Code-only tabs (most common)**
Used in: client_credentials, refresh_token, password, revoke, introspect

These show "Query String" vs "Basic Auth" vs sometimes a third option. Each tab contains a single fenced code block. These map cleanly to VitePress code groups.

Docusaurus:
```mdx
<Tabs>
  <TabItem value="query-string" label="Query String">
    ```http request
    POST /token HTTP/1.1
    ...
    ```
  </TabItem>
  <TabItem value="basic-auth" label="Basic Auth">
    ```http request []
    POST /token HTTP/1.1
    ...
    ```
  </TabItem>
</Tabs>
```

VitePress equivalent:
```md
::: code-group

```http [Query String]
POST /token HTTP/1.1
...
```

```http [Basic Auth]
POST /token HTTP/1.1
...
```

:::
```

**Note on language tag:** Docusaurus uses `` ```http request `` and `` ```http request [] `` — VitePress/Shiki uses just `` ```http ``. The `request` and `[]` suffixes must be removed.

**Pattern B: Code tabs with mixed content**
Used in: endpoints/revoke.mdx, endpoints/introspect.mdx (the `authenticateRevoke = false` / `authenticateIntrospect = false` tab)

These tabs contain a TypeScript config snippet followed by an HTTP request block. Two code blocks in one tab. For code groups, each tab can only be one block, so these need to be restructured:
- Option 1: Merge into a single block with a comment separator
- Option 2: Show the config snippet before the code group, then the code group for the request variants

Recommend Option 2 — cleaner separation.

**Pattern C: Large code tabs (protecting_resources)**
Express vs Fastify middleware — each tab is a full TypeScript code block (~60 lines). Maps cleanly to code group.

**Pattern D: Installation tabs (getting_started/index.mdx)**
Imports `<Installation />` partial from `src/pages/_index_install.mdx` which renders 6 tabs (pnpm, npm, yarn, jsr, deno, bun). Each is a one-liner.

VitePress equivalent:
```md
::: code-group

```bash [pnpm]
pnpm add @jmondi/oauth2-server
```

```bash [npm]
npm install --save @jmondi/oauth2-server
```

```bash [yarn]
yarn add @jmondi/oauth2-server
```

```bash [jsr]
npx jsr add @jmondi/oauth2-server
```

```bash [deno]
deno add @jmondi/oauth2-server
```

```bash [bun]
bunx jsr add @jmondi/oauth2-server
```

:::
```

### 4. `<details>`/`<summary>` blocks

Several files use raw HTML `<details>`/`<summary>` for collapsible sections. VitePress supports raw HTML in markdown, so **these can stay as-is** with no changes needed.

Found in: client_credentials.mdx, revoke.mdx, introspect.mdx

### 5. RequiredForGrants component (1 file)

Only used in `getting_started/repositories.mdx`. Renders colored badge-links like:

> **Used in Grants:** [Authorization Code](/docs/grants/authorization_code) | [Client Credentials](/docs/grants/client_credentials) | ...

5 usages in that file:
1. `<RequiredForGrants grants={["authorization_code"]} />`
2. `<RequiredForGrants grants={["authorization_code", "client_credentials", "refresh_token", "password", "implicit", "custom"]} />`
3. Same as #2 (scopes)
4. Same as #2 (tokens)
5. `<RequiredForGrants grants={["authorization_code", "password"]} />`

Replace each with:

```md
> **Used in Grants:** [Authorization Code](/docs/grants/authorization_code) · [Password](/docs/grants/password)
```

Grant label → href mapping:
- Authorization Code → `/docs/grants/authorization_code`
- Client Credentials → `/docs/grants/client_credentials`
- Refresh Token → `/docs/grants/refresh_token`
- Password → `/docs/grants/password`
- Implicit → `/docs/grants/implicit`
- Custom → `/docs/grants/custom`

### 6. Internal link extensions

Docusaurus links reference files with extensions: `./entities.md`, `./repositories.mdx`, `../endpoints/index.mdx`, `../authorization_server/configuration.mdx`

VitePress also supports `.md` links and resolves them. After renaming `.mdx` → `.md`, update any `.mdx` references in links to `.md`. Links like `./repositories.mdx` → `./repositories.md`.

### 7. Frontmatter cleanup

Current frontmatter fields:
- `sidebar_position` — Not used by VitePress (sidebar order is in config.mts). Remove from all files.
- `title` — Keep. VitePress uses this for page title and sidebar label when present.

### 8. Code block language tags

Docusaurus allows non-standard language hints:
- `` ```http request `` → change to `` ```http ``
- `` ```http request [] `` → change to `` ```http ``
- `` ```ts `` → keep (Shiki supports this)
- `` ```typescript `` → keep
- `` ```bash `` → keep
- `` ```sql `` → keep
- `` ```json `` → keep

## VitePress configuration reference

### Minimal config.mts structure

```ts
import { defineConfig } from "vitepress";

export default defineConfig({
  title: "@jmondi/oauth2-server",
  description: "A standards compliant OAuth 2.0 authorization server for Node.js",

  head: [
    ["link", { rel: "icon", href: "/favicon.ico" }],
    ["link", { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png" }],
    ["link", { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16x16.png" }],
    ["meta", { property: "og:image", content: "/img/oauth2-server-social-card.jpg" }],
  ],

  themeConfig: {
    logo: "/img/logo.svg",

    nav: [
      { text: "Guide", link: "/docs/getting_started/" },
      { text: "Config", link: "/docs/authorization_server/configuration" },
    ],

    sidebar: {
      "/docs/": [
        {
          text: "Getting Started",
          items: [
            { text: "Introduction", link: "/docs/getting_started/" },
            { text: "Entities", link: "/docs/getting_started/entities" },
            { text: "Repositories", link: "/docs/getting_started/repositories" },
            { text: "Database Schema", link: "/docs/getting_started/database_schema" },
            { text: "Protecting Resources", link: "/docs/getting_started/protecting_resources" },
          ],
        },
        // ... more sections
      ],
    },

    socialLinks: [
      { icon: "github", link: "https://github.com/jasonraimondi/ts-oauth2-server" },
    ],

    editLink: {
      pattern: "https://github.com/jasonraimondi/ts-oauth2-server/edit/main/docs/:path",
    },

    search: {
      provider: "algolia",
      options: {
        appId: "JP2YS2S0EQ",
        apiKey: "bf2bc45ac2821dba462ee887527c1816",
        indexName: "tsoauth2server",
      },
    },

    footer: {
      message: "",
      copyright: "© 2024 Jason Raimondi",
    },
  },
});
```

### Theme color overrides

Create `.vitepress/theme/index.ts`:
```ts
import DefaultTheme from "vitepress/theme";
import "./custom.css";

export default DefaultTheme;
```

Create `.vitepress/theme/custom.css`:
```css
:root {
  --vp-c-brand-1: #2e8555;
  --vp-c-brand-2: #3cad6e;
  --vp-c-brand-3: #4dc47f;
}

.dark {
  --vp-c-brand-1: #966cf7;
  --vp-c-brand-2: #b08df9;
  --vp-c-brand-3: #ded1fc;
}
```

### VitePress code group syntax

```md
::: code-group

```ts [Express]
// express code
```

```ts [Fastify]
// fastify code
```

:::
```

### VitePress custom container syntax

```md
::: info
Content here
:::

::: tip Custom Title
Content here
:::

::: warning
Content here
:::

::: danger STOP
Content here
:::
```

### Landing page redirect

To make the site root go to Getting Started, create a top-level `docs/index.md`:

```md
---
layout: home
hero:
  name: ts-oauth2-server
  text: OAuth 2.0 Authorization Server
  tagline: Standards compliant, JWT, PKCE — written in TypeScript
  actions:
    - theme: brand
      text: Get Started
      link: /docs/getting_started/
    - theme: alt
      text: GitHub
      link: https://github.com/jasonraimondi/ts-oauth2-server
---
```

Or for a direct redirect with no landing, use meta refresh in `docs/index.md`:
```md
---
head:
  - - meta
    - http-equiv: refresh
      content: 0;url=/docs/getting_started/
---
```

### package.json

```json
{
  "name": "ts-oauth2-server-docs",
  "private": true,
  "scripts": {
    "dev": "vitepress dev",
    "build": "vitepress build",
    "preview": "vitepress preview"
  },
  "devDependencies": {
    "vitepress": "^1.6.3"
  }
}
```

## Files requiring changes (complete list)

### Must rename .mdx → .md (19 files)
- getting_started/index.mdx
- getting_started/repositories.mdx
- getting_started/protecting_resources.mdx
- authorization_server/index.mdx
- authorization_server/configuration.mdx
- endpoints/index.mdx
- endpoints/authorize.mdx
- endpoints/token.mdx
- endpoints/revoke.mdx
- endpoints/introspect.mdx
- grants/index.mdx
- grants/authorization_code.mdx
- grants/client_credentials.mdx
- grants/refresh_token.mdx
- grants/password.mdx
- grants/implicit.mdx
- grants/token_exchange.mdx
- grants/custom.mdx

### Have imports to strip
Same 19 files above, plus getting_started/index.mdx also imports `<Installation />` partial.

### Have admonitions to convert (21 files)
All of the above plus: database_schema.md, entities.md, express.md, fastify.md, h3.md, vanilla.md

### Have Tabs to convert (7 files)
- getting_started/index.mdx (Installation partial)
- getting_started/protecting_resources.mdx (Express vs Fastify)
- grants/client_credentials.mdx (Query String vs Basic Auth)
- grants/refresh_token.mdx (Query String vs Basic Auth)
- grants/password.mdx (Query String vs Basic Auth)
- endpoints/revoke.mdx (Query String vs Basic Auth vs disabled auth — 3 tabs)
- endpoints/introspect.mdx (Query String vs Basic Auth vs disabled auth — 3 tabs; Headers vs Body — 2 tabs)

### Have RequiredForGrants to replace (1 file)
- getting_started/repositories.mdx (5 usages)

### Have .mdx internal link references to fix
- getting_started/index.mdx references `./repositories.mdx` and `../endpoints/index.mdx` and `../authorization_server/configuration.mdx`

### Pure markdown files (no changes needed beyond frontmatter cleanup)
- getting_started/entities.md
- getting_started/database_schema.md
- adapters/index.md, express.md, fastify.md, h3.md, vanilla.md
- Extras/access_tokens.md, glossary.md, references.md
- faqs.md
- upgrade_guide.md

(These only need `sidebar_position` removed from frontmatter, and any `:::note`/`:::caution` converted.)
