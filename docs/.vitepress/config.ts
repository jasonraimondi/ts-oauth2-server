export default {
  title: "@jmondi/oauth2-server",
  description: "A standards compliant implementation of an OAuth 2.0 authorization server for Node that utilizes JWT and Proof Key for Code Exchange (PKCE), written in TypeScript. ",
  base: "/ts-oauth2-server/",
  themeConfig: {
    nav: [
      { text: "Github", link: "https://github.com/jasonraimondi/ts-oauth2-server" },
      { text: "Getting Started", link: "/getting_started/" },
    ],
    sidebar: [
      {
        text: "",
        items: [
          { text: "TypeScript OAuth2.0 Server", link: "/" },
          { text: "Getting Started", link: "/getting_started/" },
        ],
      },
      {
        text: "Grants",
        items: [
          { text: "Grants", link: "/grants/" },
          { text: "Client Credentials", link: "/grants/client_credentials" },
          { text: "Authorization Code", link: "/grants/authorization_code" },
          { text: "Refresh Token", link: "/grants/refresh_token" },
          { text: "Password", link: "/grants/password" },
          { text: "Implicit", link: "/grants/implicit" },
        ],
      },
      {
        text: "",
        items: [
          { text: "Repository Interface", link: "/repositories/" },
          { text: "Entity Interfaces", link: "/entities/" },
          { text: "Adapters", link: "/adapters/" },
          { text: "Glossary", link: "/glossary/" },
          { text: "Sources", link: "/sources/" },
        ],
      },
    ],
  },
  plugins: {
    "plausible": { domain: "jasonraimondi.github.io/ts-oauth2-server" },
  },
};
