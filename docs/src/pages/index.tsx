import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import Heading from "@theme/Heading";
import { IconPackOauth } from "@site/src/components/icons";

import HowToInstall from "./_index_install.mdx";
import ExampleEntities from "./_example_entities.mdx";
import ExampleRepositories from "./_example_repositories.mdx";
import ExampleAuthorizationServer from "./_example_authorization_server.mdx";
import WhichGrant from "./_which_grant.mdx";
import MarkdownWrapper from "@site/src/components/MarkdownWrapper";
import { LinkIcon } from "lucide-react";
import { Contributors } from "@site/src/components/Contributors";
import { Sponsors } from "@site/src/components/Sponsors";

export function GithubLogo() {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 1024 1024"
      xmlns="http://www.w3.org/2000/svg"
      className="fill-current"
    >
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M8 0C3.58 0 0 3.58 0 8C0 11.54 2.29 14.53 5.47 15.59C5.87 15.66 6.02 15.42 6.02 15.21C6.02 15.02 6.01 14.39 6.01 13.72C4 14.09 3.48 13.23 3.32 12.78C3.23 12.55 2.84 11.84 2.5 11.65C2.22 11.5 1.82 11.13 2.49 11.12C3.12 11.11 3.57 11.7 3.72 11.94C4.44 13.15 5.59 12.81 6.05 12.6C6.12 12.08 6.33 11.73 6.56 11.53C4.78 11.33 2.92 10.64 2.92 7.58C2.92 6.71 3.23 5.99 3.74 5.43C3.66 5.23 3.38 4.41 3.82 3.31C3.82 3.31 4.49 3.1 6.02 4.13C6.66 3.95 7.34 3.86 8.02 3.86C8.7 3.86 9.38 3.95 10.02 4.13C11.55 3.09 12.22 3.31 12.22 3.31C12.66 4.41 12.38 5.23 12.3 5.43C12.81 5.99 13.12 6.7 13.12 7.58C13.12 10.65 11.25 11.33 9.47 11.53C9.76 11.78 10.01 12.26 10.01 13.01C10.01 14.08 10 14.94 10 15.21C10 15.42 10.15 15.67 10.55 15.59C13.71 14.53 16 11.53 16 8C16 3.58 12.42 0 8 0Z"
        transform="scale(64)"
      />
    </svg>
  );
}

export function NPMLogo() {
  return (
    <svg
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      height="100%"
      className="fill-current"
      viewBox="0 0 18 7"
    >
      <path d="M0,0h18v6H9v1H5V6H0V0z M1,5h2V2h1v3h1V1H1V5z M6,1v5h2V5h2V1H6z M8,2h1v2H8V2z M11,1v4h2V2h1v3h1V2h1v3h1V1H11z" />
      <polygon fill="transparent" points="1,5 3,5 3,2 4,2 4,5 5,5 5,1 1,1 " />
      <path fill="transparent" d="M6,1v5h2V5h2V1H6z M9,4H8V2h1V4z" />
      <polygon
        fill="transparent"
        points="11,1 11,5 13,5 13,2 14,2 14,5 15,5 15,2 16,2 16,5 17,5 17,1 "
      />
    </svg>
  );
}

export function JSRLogo() {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 121 65"
      className="fill-current"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M18.6154 18.5714H0V55.7143H37.2308V65H102.385V46.4286H121V9.28571H83.7692V0H18.6154V18.5714ZM18.6154 27.8571H9.30769V46.4286H37.2308V9.28571H27.9231V37.1429H18.6154V27.8571ZM46.5385 9.28571H74.4615V18.5714H55.8462V27.8571H74.4615V55.7143H46.5385V46.4286H65.1538V37.1429H46.5385V9.28571ZM111.692 18.5714H83.7692V55.7143H93.0769V27.8571H102.385V37.1429H111.692V18.5714Z"
      />
    </svg>
  );
}

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

export default function Home() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={`@jmondi/oauth2-server`}
      description="Description will go into a meta tag in <head />"
    >
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

      <div className="pt-14">
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

      <MarkdownWrapper>
        <div className="pt-14">
          <h3 className="text-center text-4xl font-semibold">Install</h3>
          <HowToInstall />
        </div>

        <div className="py-14">
          <h3 className="text-center text-2xl font-semibold">Entities and Repositories <a href="docs/getting_started/entities"><LinkIcon className="w-4" /></a><a href="docs/getting_started/repositories"><LinkIcon className="w-4" /></a></h3>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div>
              <ExampleEntities />
            </div>
            <div>
              <ExampleRepositories />
            </div>
          </div>
          <div>
            <h3 className="text-center text-2xl font-semibold">The Authorization Server <a href="/docs/authorization_server"><LinkIcon className="w-4" /></a></h3>
            <ExampleAuthorizationServer />
          </div>
        </div>

        <div className="py-14">
          <h3 className="text-center text-2xl font-semibold">Which Grant? <a href="/docs/grants"><LinkIcon className="w-4" /></a></h3>
          <WhichGrant />
        </div>

        <div className="py-14 flex flex-col justify-center align-middle text-center">
          <h3 className="text-2xl font-semibold">Contributors</h3>
          <div className="flex justify-center">
            <Contributors owner="jasonraimondi" repo="ts-oauth2-server" />
          </div>
          <h3 className="text-2xl font-semibold">Sponsors</h3>
          <div className="flex justify-center">
            <Sponsors username="jasonraimondi" />
          </div>
        </div>
      </MarkdownWrapper>
    </Layout>
  );
}
