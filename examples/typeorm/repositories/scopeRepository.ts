import { getRepository, In } from "typeorm";
import { OAuthScope, OAuthScopeRepository } from "../../../src";
import OAuthScopeImp from "../entities/oauthScope";

export const scopeRepository: OAuthScopeRepository = {
  // Find all scopes by scope names
  async getAllByIdentifiers(scopeNames: string[]): Promise<OAuthScope[]> {
    const scopeRepo = getRepository(OAuthScopeImp, process.env.NODE_ENV);
    return await scopeRepo.find({ where: { name: In([...scopeNames]) } });
  },
  // Scopes have already been validated against the client, if you arent
  // doing anything fancy with scopes, you can just `return scopes`,
  // Otherwise, now is your chance to add or remove any final scopes
  // after they have already been validated against the client scopes
  async finalize(
    scopes: OAuthScope[],
    // identifier: GrantIdentifier,
    // client: OAuthClient,
    // user_id?: string
  ): Promise<OAuthScope[]> {
    return scopes;
  },
};
