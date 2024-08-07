import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";
import tailwindPlugin from "./tailwind-config.cjs";

const config: Config = {
  title: "@jmondi/oauth2-server",
  plugins: [tailwindPlugin],
  tagline:
    "Standards-Compliant OAuth 2.0 Server in TypeScript, Utilizing JWT and Proof Key for Code Exchange (PKCE)",
  favicon: "favicon.ico",
  url: "https://tsoauth2server.com",
  baseUrl: "/",
  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },
  scripts: [
    { src: "https://plausible.io/js/script.js", defer: true, "data-domain": "tsoauth2server.com" },
  ],
  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: "https://github.com/jasonraimondi/ts-oauth2-server/tree/main/docs/",
        },
        blog: {
          showReadingTime: true,
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: "https://github.com/jasonraimondi/ts-oauth2-server/tree/main/docs/",
        },
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: "img/oauth2-server-social-card.jpg",
    navbar: {
      title: "ts-oauth2-server",
      logo: {
        alt: "ts-oauth2-server Logo",
        src: "img/logo.svg",
      },
      items: [
        {
          sidebarId: "mainSidebar",
          type: "docSidebar",
          label: "Docs",
          position: "left",
        },
        {
          href: "/docs/authorization_server/configuration/",
          label: "Config",
          position: "left",
        },
        {
          href: "https://github.com/sponsors/jasonraimondi",
          label: "❤️ Sponsor",
          position: "right",
        },
        {
          href: "https://github.com/jasonraimondi/ts-oauth2-server",
          label: "GitHub",
          position: "right",
        },
        // {
        //   href: "https://www.npmjs.com/package/@jmondi/oauth2-server",
        //   label: "NPM",
        //   position: "right",
        // },
        // {
        //   href: "https://jsr.io/@jmondi/oauth2-server",
        //   label: "JSR",
        //   position: "right",
        // },
      ],
    },
    footer: {
      style: "dark",
      copyright: `© ${new Date().getFullYear()} <a href="https://jasonraimondi.com">Jason Raimondi</a>`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
    algolia: {
      appId: "JP2YS2S0EQ",
      apiKey: "bf2bc45ac2821dba462ee887527c1816",
      indexName: "tsoauth2server",
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
