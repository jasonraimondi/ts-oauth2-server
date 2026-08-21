import { defineConfig } from "vitepress";

export default defineConfig({
  title: "@jmondi/oauth2-server",
  description:
    "A standards compliant implementation of an OAuth 2.0 authorization server for Node.js",

  cleanUrls: true,

  sitemap: {
    hostname: "https://tsoauth2server.com",
  },

  head: [
    ["link", { rel: "icon", href: "/favicon.ico" }],
    [
      "link",
      {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        href: "/favicon-32x32.png",
      },
    ],
    [
      "link",
      {
        rel: "icon",
        type: "image/png",
        sizes: "16x16",
        href: "/favicon-16x16.png",
      },
    ],
    [
      "meta",
      {
        property: "og:image",
        content: "/img/oauth2-server-social-card.jpg",
      },
    ],
    [
      "meta",
      {
        property: "og:title",
        content: "@jmondi/oauth2-server",
      },
    ],
    [
      "meta",
      {
        property: "og:description",
        content:
          "A standards compliant implementation of an OAuth 2.0 authorization server for Node.js",
      },
    ],
    ["meta", { name: "twitter:card", content: "summary_large_image" }],
  ],

  themeConfig: {
    logo: "/img/logo.svg",

    nav: [
      { text: "Guide", link: "/" },
      {
        text: "Config",
        link: "/docs/authorization_server/configuration",
      },
      {
        text: "Example",
        link: "https://github.com/jasonraimondi/ts-oauth2-server-example",
      },
    ],

    sidebar: {
      "/": [
        {
          text: "Getting Started",
          items: [
            { text: "Introduction", link: "/" },
            { text: "Entities", link: "/docs/getting_started/entities" },
            {
              text: "Repositories",
              link: "/docs/getting_started/repositories",
            },
            {
              text: "Database Schema",
              link: "/docs/getting_started/database_schema",
            },
          ],
        },
        {
          text: "Authorization Server",
          items: [
            {
              text: "Overview",
              link: "/docs/authorization_server/",
            },
            {
              text: "Configuration",
              link: "/docs/authorization_server/configuration",
            },
            {
              text: "Adapters",
              link: "/docs/adapters/",
            },
          ],
        },
        {
          text: "Grants",
          items: [
            { text: "Overview", link: "/docs/grants/" },
            {
              text: "Authorization Code with PKCE",
              link: "/docs/grants/authorization_code",
            },
            {
              text: "Client Credentials",
              link: "/docs/grants/client_credentials",
            },
            {
              text: "Refresh Token",
              link: "/docs/grants/refresh_token",
            },
            {
              text: "Token Exchange",
              link: "/docs/grants/token_exchange",
            },
            { text: "Custom Grant", link: "/docs/grants/custom" },
            {
              text: "Legacy",
              items: [
                { text: "Password", link: "/docs/grants/password" },
                { text: "Implicit", link: "/docs/grants/implicit" },
              ],
            },
          ],
        },
        {
          text: "Endpoints",
          items: [
            {
              text: "Core",
              items: [
                { text: "/authorize", link: "/docs/endpoints/authorize" },
                { text: "/token", link: "/docs/endpoints/token" },
              ],
            },
            {
              text: "Token Management",
              items: [
                { text: "/token/revoke", link: "/docs/endpoints/revoke" },
                {
                  text: "/token/introspect",
                  link: "/docs/endpoints/introspect",
                },
              ],
            },
          ],
        },
        {
          text: "OpenID Connect",
          items: [
            { text: "Getting Started with OIDC", link: "/docs/oidc/getting_started" },
            { text: "Keypair Lifecycle", link: "/docs/oidc/keypair_lifecycle" },
            { text: "Hooks", link: "/docs/oidc/hooks" },
            {
              text: "Endpoints",
              items: [
                { text: "/userinfo", link: "/docs/endpoints/userinfo" },
                { text: "/.well-known/openid-configuration", link: "/docs/endpoints/discovery" },
              ],
            },
            { text: "Conformance smoke test", link: "/docs/endpoints/oidc_conformance" },
          ],
        },
        {
          text: "Protect Resources",
          link: "/docs/getting_started/protecting_resources",
        },
        { text: "Upgrade Guide", link: "/docs/upgrade_guide" },
      ],
    },

    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/jasonraimondi/ts-oauth2-server",
      },
    ],

    editLink: {
      pattern:
        "https://github.com/jasonraimondi/ts-oauth2-server/edit/main/docs/:path",
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
      copyright: `© ${new Date().getFullYear()} Jason Raimondi`,
    },
  },
});
