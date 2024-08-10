import { CheckCircleIcon, LinkIcon } from "lucide-react";
import { Contributors } from "@jmondi/github-ui/contributors";
import { Sponsors } from "@jmondi/github-ui/sponsors";
import "@jmondi/github-ui/style.css"

import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import Heading from "@theme/Heading";
import { IconPackOauth } from "@site/src/components/icons";
import MarkdownWrapper from "@site/src/components/MarkdownWrapper";
import {
  ExpressLogo,
  FastifyLogo,
  GithubLogo,
  JSRLogo,
  NPMLogo,
  TSLogo,
} from "@site/src/pages/_logos";

import HowToInstall from "./_index_install.mdx";
import ExampleEntities from "./_example_entities.mdx";
import ExampleRepositories from "./_example_repositories.mdx";
import ExampleAuthorizationServer from "./_example_authorization_server.mdx";
import WhichGrant from "./_which_grant.mdx";

function HeroButton({ href, children }) {
  return (
    <a
      href={href}
      className="px-4 py-1 text-black hover:text-black bg-white hover:bg-gray-200 border border-gray-800 rounded hover:no-underline"
    >
      {children}
    </a>
  );
}

function FeatureListItem({ to, title }) {
  return (
    <li key={to} className="-ml-2">
      <a
        className="font-medium px-4 text-[--ifm-color-primary] hover:text-[--ifm-color-primary] block"
        href={to}
      >
        <small className="max-w-3.5 inline-block mr-2">
          <CheckCircleIcon className="h-full w-full relative top-2/3" />
        </small>
        {title}
      </a>
    </li>
  );
}

function Features() {
  const grants = [
    {
      to: "/docs/grants/authorization_code",
      title: "Authorization code grant",
    },
    {
      to: "/docs/grants/client_credentials",
      title: "Client credentials grant",
    },
    {
      to: "/docs/grants/refresh_token",
      title: "Refresh grant",
    },
    {
      to: "/docs/grants/implicit",
      title: "Implicit grant (not recommended)",
    },
    {
      to: "/docs/grants/password",
      title: "Resource owner password credentials grant (not recommended)",
    },
  ];

  const rfcs = [
    {
      to: "https://tools.ietf.org/html/rfc6749",
      title: `RFC6749 "OAuth 2.0"`,
    },
    {
      to: "https://tools.ietf.org/html/rfc6750",
      title: `RFC6750 "The OAuth 2.0 Authorization Framework: Bearer Token Usage`,
    },
    {
      to: "https://tools.ietf.org/html/rfc7009",
      title: `RFC7009 "OAuth 2.0 Token Revocation"`,
    },
    {
      to: "https://tools.ietf.org/html/rfc7519",
      title: `RFC7519 "JSON Web Token (JWT)"`,
    },
    {
      to: "https://tools.ietf.org/html/rfc7636",
      title: `RFC7636 "Proof Key for Code Exchange by OAuth Public Clients"`,
    },
    {
      to: "https://tools.ietf.org/html/rfc7662",
      title: `RFC7662 "OAuth 2.0 Token Introspection"`,
    },
    {
      to: "https://datatracker.ietf.org/doc/html/rfc8693",
      title: `RFC8693 "OAuth 2.0 Token Exchange"`,
    },
  ];

  return (
    <div className="pt-14 px-3 w-full max-w-4xl mx-auto prose prose-lg grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="text-center">
        <SectionTitle>Supported Grants</SectionTitle>
        <ul className="list-none pl-0 flex flex-col gap-2">
          {grants.map(({ to, title }) => {
            return <FeatureListItem key={to} to={to} title={title} />;
          })}
        </ul>
      </div>
      <div className="text-center">
        <SectionTitle>Implemented RFCs</SectionTitle>
        <ul className="list-none pl-0 flex flex-col gap-2">
          {rfcs.map(({ to, title }) => {
            return <FeatureListItem key={to} to={to} title={title} />;
          })}
        </ul>
      </div>
    </div>
  );
}

export function SectionTitle({ children }) {
  return <h3 className="text-center text-4xl font-semibold pb-4">{children}</h3>;
}

export function Adapters() {
  const adapters = [
    {
      name: "ExpressJS",
      logo: <ExpressLogo />,
      href: "/docs/adapters/express",
    },
    {
      name: "FastifyJS",
      logo: <FastifyLogo />,
      href: "/docs/adapters/fastify",
    },
    {
      name: "Vanilla JS/TS",
      logo: <TSLogo />,
      href: "/docs/adapters/vanilla",
    },
  ] as const;

  return (
    <div className="pt-14 px-3">
      <SectionTitle>Built in Adapters</SectionTitle>
      <div className="flex justify-center gap-16">
        {adapters.map(({ name, logo, href }) => {
          return (
            <a
              key={name}
              className="flex flex-col items-center justify-center text-[--ifm-heading-color] hover:text-[--ifm-heading-color]"
              href={href}
            >
              <span className="w-24 inline-block">{logo}</span>
              {name}
            </a>
          );
        })}
      </div>
    </div>
  );
}

export default function Home() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout title={`@jmondi/oauth2-server`} description={siteConfig.tagline}>
      <header className="text-white bg-gradient-to-br from-[--ifm-color-primary] to-[--ifm-color-primary-darkest]">
        <div className="container py-14 md:py-24">
          <div className="flex items-center justify-center gap-6">
            <div className="flex">
              <div className="max-w-24">
                <IconPackOauth />
              </div>
            </div>

            <Heading as="h1" className="hero__title">
              ts-oauth2-server
            </Heading>
          </div>

          <p className="hero__subtitle pt-8 md:px-14">{siteConfig.tagline}</p>

          <div className="flex justify-center gap-4">
            <HeroButton href="/docs/getting_started">Get Started</HeroButton>
          </div>
        </div>
      </header>

      <div className="pt-14 px-3 flex flex-col justify-center align-middle text-center">
        <SectionTitle>Contributors</SectionTitle>
        <div className="flex justify-center">
          {typeof window !== 'undefined' && <Contributors owner="jasonraimondi" repo="ts-oauth2-server" />}
        </div>
        <SectionTitle>Sponsors</SectionTitle>
        <div className="flex justify-center">
          {typeof window !== 'undefined' && <Sponsors username="jasonraimondi" />}
        </div>
      </div>
      <Features />
      <Adapters />
      <MarkdownWrapper>
        <div className="pt-14">
          <SectionTitle>Install</SectionTitle>
          <HowToInstall />
        </div>

        <div className="pt-14">
          <SectionTitle>
            Entities and Repositories
            <a href="docs/getting_started/entities" className="pl-1">
              <LinkIcon className="w-4" />
            </a>
            <a href="docs/getting_started/repositories">
              <LinkIcon className="w-4" />
            </a>
          </SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div>
              <ExampleEntities />
            </div>
            <div>
              <ExampleRepositories />
            </div>
          </div>
          <div>
            <SectionTitle>
              The Authorization Server
              <a href="/docs/authorization_server" className="pl-1">
                <LinkIcon className="w-4" />
              </a>
            </SectionTitle>
            <ExampleAuthorizationServer />
          </div>
        </div>

        <div className="pt-14">
          <SectionTitle>
            Which Grant?
            <a href="/docs/grants" className="pl-1">
              <LinkIcon className="w-4" />
            </a>
          </SectionTitle>
          <WhichGrant />
        </div>
      </MarkdownWrapper>

      <div className="pt-14 px-3">
        <SectionTitle>Source</SectionTitle>
        <div className="flex justify-center gap-14">
          <a
            href="https://github.com/jasonraimondi/ts-oauth2-server"
            className="w-20 text-[--ifm-heading-color] hover:text-[--ifm-heading-color]"
            title="Find us on https://github.com"
          >
            <GithubLogo />
          </a>
          <a
            href="https://www.npmjs.com/package/@jmondi/oauth2-server"
            className="w-28 text-[--ifm-heading-color] hover:text-[--ifm-heading-color]"
            title="Find us on https://npmjs.com"
          >
            <NPMLogo />
          </a>
          <a
            href="https://jsr.io/@jmondi/oauth2-server"
            className="w-24 text-[--ifm-heading-color] hover:text-[--ifm-heading-color]"
            title="Find us on https://jsr.io"
          >
            <JSRLogo />
          </a>
        </div>
      </div>
      <div className="pt-28"></div>
    </Layout>
  );
}
