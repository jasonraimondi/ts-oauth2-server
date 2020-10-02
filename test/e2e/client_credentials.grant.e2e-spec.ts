import request from "supertest";
import { Application } from "express";

import { OAuthClient } from "~/entities/client.entity";
import { OAuthScope } from "~/entities/scope.entity";
import { REGEX_ACCESS_TOKEN } from "~/grants/auth_code.grant";
import { base64encode } from "~/utils/base64";
import { inMemoryDatabase } from "../../examples/in_memory/database";
import { inMemoryExpressApp } from "../../examples/in_memory/main";
import { expectTokenResponse } from "../unit/grants/client_credentials.grant.spec";

describe.skip("client_credentials grant e2e", () => {
  let client: OAuthClient;
  let clientNoSecret: OAuthClient;

  let scope1: OAuthScope;
  let scope2: OAuthScope;

  let app: Application;

  beforeEach(async () => {
    app = inMemoryExpressApp;

    scope1 = { name: "scope-1" };
    scope2 = { name: "scope-2" };
    client = {
      id: "1",
      name: "test client",
      secret: "super-secret-secret",
      redirectUris: ["http://localhost"],
      allowedGrants: ["client_credentials"],
      scopes: [scope1, scope2],
    };

    clientNoSecret = {
      id: "2",
      name: "disallow-client-credentials",
      secret: undefined,
      redirectUris: ["http://localhost"],
      allowedGrants: ["client_credentials"],
      scopes: [scope1, scope2],
    };

    inMemoryDatabase.clients[client.id] = client;
    inMemoryDatabase.clients[clientNoSecret.id] = clientNoSecret;

    inMemoryDatabase.scopes[scope1.name] = scope1;
    inMemoryDatabase.scopes[scope2.name] = scope2;
  });

  it("completes client_credentials grant as basic auth header", () => {
    const basicAuth = "Basic " + base64encode(`${client.id}:${client.secret}`);
    return request(app)
      .post("/token")
      .set("Authorization", basicAuth)
      .send({
        grant_type: "client_credentials",
        scopes: ["scope-1", "scope-2"],
      })
      .expect("Content-Type", /json/)
      .expect(response => {
        console.log(response.body);

        expect(response.get("cache-control")).toBe("no-store");
        expect(response.get("pragma")).toBe("no-cache");
        expect(response.status).toBe(200);

        expectTokenResponse(response.body);
      });
  });

  it("completes client_credentials grant as body post", () => {
    return request(app)
      .post("/token")
      .send({
        grant_type: "client_credentials",
        client_id: client.id,
        client_secret: client.secret,
        scopes: ["scope-1"],
      })
      .expect("Content-Type", /json/)
      .expect(response => {
        console.log(response.body);

        expect(response.get("cache-control")).toBe("no-store");
        expect(response.get("pragma")).toBe("no-cache");
        expect(response.status).toBe(200);

        expect(response.body.token_type).toBe("Bearer");
        expect(response.body.expires_in).toBe(3600);
        expect(typeof response.body.access_token === "string").toBeTruthy();
        expect(response.body.access_token.split(".").length).toBe(3);
        expect(response.body.access_token).toMatch(REGEX_ACCESS_TOKEN);
        // expect(response.body.refresh_token).toMatch(ACCESS_TOKEN_REGEX);
      });
  });

  it("throws for client without client_credentials", () => {
    return request(app)
      .post("/token")
      .send({
        grant_type: "client_credentials",
        client_id: clientNoSecret.id,
        scopes: ["scope-1"],
      })
      .expect(400)
      .expect("Content-Type", /json/)
      .expect(response => {
        expect(response.body.message).toBe("Client authentication failed");
      });
  });
});
