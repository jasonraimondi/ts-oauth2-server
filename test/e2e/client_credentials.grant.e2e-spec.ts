import request from "supertest";
import { Application } from "express";

import { OAuthClient } from "../../src/entities";
import { inMemoryDatabase } from "../../examples/in_memory/database";
import { base64encode } from "../../src/utils";
import { inMemoryExpressApp } from "../../examples/in_memory/main";
import { ACCESS_TOKEN_REGEX } from "./auth_code.grant.e2e-spec";

describe("client_credentials grant e2e", () => {
  let client: OAuthClient;
  let clientNoSecret: OAuthClient;

  let app: Application;

  beforeEach(async () => {
    app = inMemoryExpressApp;

    client = {
      id: "1",
      isConfidential: false,
      name: "test client",
      secret: "super-secret-secret",
      redirectUris: ["http://localhost"],
      allowedGrants: ["client_credentials"],
    };

    clientNoSecret = {
      id: "2",
      isConfidential: false,
      name: "disallow-client-credentials",
      secret: undefined,
      redirectUris: ["http://localhost"],
      allowedGrants: ["client_credentials"],
    };

    inMemoryDatabase.clients.push(client, clientNoSecret);
    inMemoryDatabase.scopes.push({ name: "scope-1" }, { name: "scope-2" });
  });

  it.only("completes client_credentials grant as basic auth header", () => {
    const basicAuth = "Basic " + base64encode(`${client.id}:${client.secret}`);
    return request(app)
      .post("/token")
      .set("Authorization", basicAuth)
      .send({
        grant_type: "client_credentials",
        scopes: ["scope-1", "scope-2"],
      })
      .expect(200)
      .expect("Content-Type", /json/)
      .expect("Cache-Control", "no-store")
      .expect("Pragma", "no-cache")
      .expect((response) => {
        expect(response.body.token_type).toBe("Bearer");
        expect(response.body.expires_in).toBe(3600);
        expect(typeof response.body.access_token === "string").toBeTruthy();
        expect(response.body.access_token.split(".").length).toBe(3);
        expect(response.body.access_token).toMatch(ACCESS_TOKEN_REGEX);
        expect(response.body.scope).toBe("scope-1 scope-2");
        // expect(response.body.refresh_token).toBeTruthy();
        // expect(response.body.refresh_token).toMatch(ACCESS_TOKEN_REGEX);
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
      .expect(200)
      .expect("Content-Type", /json/)
      .expect("Cache-Control", "no-store")
      .expect("Pragma", "no-cache")
      .expect((response) => {
        expect(response.body.token_type).toBe("Bearer");
        expect(response.body.expires_in).toBe(3600);
        expect(typeof response.body.access_token === "string").toBeTruthy();
        expect(response.body.access_token.split(".").length).toBe(3);
        expect(response.body.access_token).toMatch(ACCESS_TOKEN_REGEX);
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
      .expect("Cache-Control", "no-store")
      .expect("Pragma", "no-cache")
      .expect((response) => {
        expect(response.body.message).toBe("Client authentication failed");
      });
  });
});
