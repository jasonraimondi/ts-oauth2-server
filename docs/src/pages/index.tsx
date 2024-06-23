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
import {Card} from "@site/src/components/Card";

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx("hero hero--primary", styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          @jmondi/oauth2-server
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link className="button button--secondary button--lg" to="/docs/intro">
            Getting Started
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`@jmondi/oauth2-server`}
      description="Description will go into a meta tag in <head />"
    >
      <HomepageHeader/>
      <section className={styles.spikes}></section>

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

      <HomepageFeatures/>
    </Layout>
  );
}
