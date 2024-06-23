import clsx from "clsx";
import Heading from "@theme/Heading";
import styles from "./styles.module.css";
import CodeBlock from "@theme/CodeBlock";

type FeatureItem = {
  title: string;
  description: JSX.Element;
};

const FeatureList: FeatureItem[] = [
  {
    title: "Implement Entities",
    description: (
      <>
        <CodeBlock language="ts" title="entities/client_entity.ts">
        {`
import { OAuthClient, OAuthAuthCode, OAuthUser, OAuthScope, GrantIdentifier, ScopeEntity, CodeChallengeMethod } from '@jmondi/oauth2-server';

class ClientEntity implements OAuthClient {
  readonly id: string;
  name: string;
  secret: string | null;
  redirectUris: string[];
  allowedGrants: GrantIdentifier[];
  scopes: ScopeEntity[];
  createdAt: Date;
  updatedAt: Date | null;
}
       `.trim()}
      </CodeBlock>
        <CodeBlock language="ts" title="entities/client_entity.ts">
        {`
import { OAuthClient, OAuthAuthCode, OAuthUser, OAuthScope, GrantIdentifier, ScopeEntity, CodeChallengeMethod } from '@jmondi/oauth2-server';

class ClientEntity implements OAuthClient {
  readonly id: string;
  name: string;
  secret: string | null;
  redirectUris: string[];
  allowedGrants: GrantIdentifier[];
  scopes: ScopeEntity[];
  createdAt: Date;
  updatedAt: Date | null;
}
       `.trim()}
      </CodeBlock>
      </>
    ),
  },
  {
    title: "Implement Repositories",
    description: (
      <CodeBlock language="ts" title="repositories/client_repository.ts">
        {`
import { PrismaClient } from "@prisma/client";
import { GrantIdentifier, OAuthClient, OAuthClientRepository } from "@jmondi/oauth2-server";

import { Client } from "../entities/client.js";

export class ClientRepository implements OAuthClientRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getByIdentifier(clientId: string): Promise<Client> {
    return await this.prisma.oAuthClient.findUniqueOrThrow({
      where: {
        id: clientId,
      },
      include: {
        scopes: true,
      },
    });
  }

  async isClientValid(
    grantType: GrantIdentifier,
    client: OAuthClient,
    clientSecret?: string,
  ): Promise<boolean> {
    // implement me (see examples)
  }
}`.trim()}
      </CodeBlock>
    ),
  },
  // {
  //   title: "Authorization Server",
  //   description: (
  //     <>
  //       Built to comply with OAuth2 and OpenID Connect standards, ensuring interoperability and
  //       security. Supports various grant types including Authorization Code, Client Credentials,
  //       and Refresh Token.
  //     </>
  //   ),
  // },
];

function Feature({title, description}: FeatureItem) {
  return (
    <div className="">
      <Heading as="h3">{title}</Heading>
      <div>{description}</div>
    </div>
  );
}

export default function HomepageFeatures(): JSX.Element {
  return (
    <section className={styles.features}>
      <div className="grid md:grid-cols-2 gap-6 px-4 md:px-6">
        {FeatureList.map((props, idx) => (
          <Feature key={idx} {...props} />
        ))}
      </div>
    </section>
  );
}
