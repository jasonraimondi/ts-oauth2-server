import { AuthorizationServerOptions } from "./authorization_server.js";

export const DEFAULT_AUTHORIZATION_SERVER_OPTIONS: AuthorizationServerOptions = {
  requiresPKCE: true,
  requiresS256: true,
  notBeforeLeeway: 0,
  tokenCID: "id",
  issuer: undefined,
  scopeDelimiter: " ",
  introspectWithClientCredentials: true,
  revokeWithClientCredentials: false,
};
