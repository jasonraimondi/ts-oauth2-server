module.exports = {
  title: "@jmondi/oauth2-server",
  description: "A standards compliant implementation of an OAuth 2.0 authorization server for Node that utilizes JWT and Proof Key for Code Exchange (PKCE), written in TypeScript. ",
  base: "/typescript-oauth2-server/",
  themeConfig: {
    nav: [
      { text: "Github", link: "https://github.com/jasonraimondi/typescript-oauth2-server" },
      { text: "Getting Started", link: "/getting_started/" },
    ],
    // displayAllHeaders: true,
    sidebar: [
      "/",
      "/getting_started/",
      {
        title: "Grants",
        path: "/grants/",
        collapsable: false,
        children: [
          "/grants/client_credentials.md",
          "/grants/authorization_code.md",
          "/grants/refresh_token.md",
          "/grants/password.md",
          "/grants/implicit.md",
        ]
      },
      "/repositories/",
      "/entities/",
      "/glossary/",
      "/sources/",
    ],
  },
};
