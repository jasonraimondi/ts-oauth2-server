---
title: Adapters
---

# Adapters

An adapter is a set of helper functions. Each adapter connects `@jmondi/oauth2-server` to one framework. The library supplies four adapters:

| Adapter | Import from | Use it with |
| --- | --- | --- |
| [Express](./express.md) | `@jmondi/oauth2-server/express` | Express |
| [Fastify](./fastify.md) | `@jmondi/oauth2-server/fastify` | Fastify |
| [Vanilla](./vanilla.md) | `@jmondi/oauth2-server/vanilla` | Hono, SvelteKit, Next.js, and other tools that use the native [Request](https://developer.mozilla.org/en-US/docs/Web/API/Request) and [Response](https://developer.mozilla.org/en-US/docs/Web/API/Response) objects |
| [h3](./h3.md) | `@jmondi/oauth2-server/h3` | [h3](https://h3.dev/), Nuxt, and Nitro |
