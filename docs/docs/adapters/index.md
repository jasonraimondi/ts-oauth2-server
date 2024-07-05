---
title: Adapters
sidebar_position: 4
---

# Adapters

Adapters are a set of helper functions to provide framework specific integration into `@jmondi/oauth2-server`. We provide adapters for some common tools:

- [Express](./express) - If you're using Express, you can use the `@jmondi/oauth2-server/express` adapter.
- [Fastify](./fastify) - If you're using Fastify, you can use the `@jmondi/oauth2-server/fastify` adapter.
- [VanillaJS](./vanilla) - Adapts the Fetch [Request](https://developer.mozilla.org/en-US/docs/Web/API/Request) and [Response](https://developer.mozilla.org/en-US/docs/Web/API/Response) so you can use Honojs, Sveltekit, Nextjs or whatever tool your using that uses the native [Request](https://developer.mozilla.org/en-US/docs/Web/API/Request) and [Response](https://developer.mozilla.org/en-US/docs/Web/API/Response) `@jmondi/oauth2-server/vanilla` adapter.
