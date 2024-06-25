import clsx from "clsx";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import HomepageFeatures from "@site/src/components/HomepageFeatures";

import Heading from "@theme/Heading";
import Tabs from "@theme/Tabs";
import TabItem from "@theme/TabItem";

import styles from "./index.module.css";
import CodeBlock from "@theme/CodeBlock";
import { Card } from "@site/src/components/Card";
import { SpikesDivider } from "../components/dividers/Spikes";
import { TriangleDivider } from "../components/dividers/Triangle";

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx("hero hero--primary", styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>

        <div className="flex gap-1 justify-center">
          <a href="https://jsr.io/@jmondi/oauth2-server" target="_blank" rel="noopener noreferrer">
            <img
              decoding="async"
              loading="lazy"
              src="https://jsr.io/badges/@jmondi/oauth2-server"
              alt="JSR"
            />
          </a>
          <a
            href="https://github.com/jasonraimondi/ts-oauth2-server/releases/latest"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              decoding="async"
              loading="lazy"
              src="https://img.shields.io/github/package-json/v/jasonraimondi/ts-oauth2-server?style=flat-square"
              alt="GitHub package.json version"
            />
          </a>
          <a
            href="https://github.com/jasonraimondi/ts-oauth2-server"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              decoding="async"
              loading="lazy"
              src="https://img.shields.io/github/actions/workflow/status/jasonraimondi/ts-oauth2-server/build-and-test.yml?branch=main&style=flat-square"
              alt="GitHub Workflow Status"
            />
          </a>
          <a
            href="https://codeclimate.com/github/jasonraimondi/typescript-oauth2-server/test_coverage"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              decoding="async"
              loading="lazy"
              src="https://img.shields.io/codeclimate/coverage/jasonraimondi/typescript-oauth2-server?style=flat-square"
              alt="Test Coverage"
            />
          </a>
          <a
            href="https://www.npmjs.com/package/@jmondi/oauth2-server"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              decoding="async"
              loading="lazy"
              src="https://img.shields.io/npm/dt/@jmondi/oauth2-server?label=npm%20downloads&style=flat-square"
              alt="NPM Downloads"
            />
          </a>
        </div>
      </div>
    </header>
  );
}

export default function Home() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={`@jmondi/oauth2-server`}
      description="Description will go into a meta tag in <head />"
    >
      <HomepageHeader />
      <TriangleDivider />

      <div className="pt-20 px-10 mx-auto">
        <div className="max-w-full w-[500px]">
          <Tabs>
            <TabItem value="pnpm" label="PNPM">
              <CodeBlock language="bash">pnpm add @jmondi/oauth2-server</CodeBlock>
            </TabItem>
            <TabItem value="npm" label="NPM">
              <CodeBlock language="bash">npm install --save-dev @jmondi/oauth2-server</CodeBlock>
            </TabItem>
            <TabItem value="yarn" label="YARN">
              <CodeBlock language="bash">yarn add @jmondi/oauth2-server</CodeBlock>
            </TabItem>
          </Tabs>
        </div>
      </div>

      <HomepageFeatures />
    </Layout>
  );
}
