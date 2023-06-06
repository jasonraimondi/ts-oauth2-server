import { defineConfig } from "vitepress";

export default defineConfig({
  title: "@jmondi/oauth2-server",
  description:
    "A standards compliant implementation of an OAuth 2.0 authorization server for Node that utilizes JWT and Proof Key for Code Exchange (PKCE), written in TypeScript. ",
  base: "/ts-oauth2-server/",
  markdown: {
    toc: {
      listClass: "table-of-contents",
    }
  },
  head: [
    [
      "script",
      {
        "data-domain": "jasonraimondi.github.io/ts-oauth2-server",
        src: "https://plausible.io/js/script.js",
        defer: "true",
      },
    ],
  ],
  themeConfig: {
    siteTitle: "@jmondi/oauth2-server",
    nav: [
      { text: "Github", link: "https://github.com/jasonraimondi/ts-oauth2-server" },
      { text: "Getting Started", link: "/getting_started/" },
    ],
    sidebar: [
      {
        items: [
          { text: "Getting Started", link: "/getting_started/" },
          { text: "Configuration", link: "/configuration/" },
        ],
      },
      {
        text: "Grants",
        items: [
          { text: "Which Grant?", link: "/grants/" },
          { text: "Client Credentials", link: "/grants/client_credentials" },
          { text: "Authorization Code", link: "/grants/authorization_code" },
          { text: "Refresh Token", link: "/grants/refresh_token" },
          { text: "Password", link: "/grants/password" },
          { text: "Implicit", link: "/grants/implicit" },
        ],
      },
      {
        text: "Repository",
        items: [
          { text: "Repository Interfaces", link: "/repositories/" },
          { text: "Entity Interfaces", link: "/entities/" },
        ],
      },
      {
        text: "Misc",
        items: [
          { text: "Adapters", link: "/adapters/" },
          { text: "Migrate v2 to v3", link: "/migration/v2_to_v3" },
          { text: "Glossary", link: "/glossary/" },
        ],
      },
      {
        items: [{ text: "Sources", link: "/sources/" }],
      },
    ],
    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © 2023 Jason Raimondi",
    },
  },
});
