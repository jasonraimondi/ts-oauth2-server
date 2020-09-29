import { AuthorizationServer } from "~/authorization_server";
import { clientCredentialsGrant } from "../../examples/in_memory/oauth_authorization_server";

describe("authorization_server", () => {
  let authorizationServer: AuthorizationServer;

  beforeEach(() => {
    authorizationServer = new AuthorizationServer();
  });

  it("can enable client_credentials grant", () => {
    authorizationServer.enableGrantType(clientCredentialsGrant);
  });
});
