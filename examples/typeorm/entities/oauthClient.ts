import { Column, Entity, JoinTable, ManyToMany } from "typeorm";
import { GrantIdentifier, OAuthClient } from "../../../src";
import OAuthScopeImp from "./oauthScope";

@Entity("oauth_client")
export default class OAuthClientImp implements OAuthClient {
  @Column({ primary: true })
  id!: string;

  @Column({ nullable: true, default: null })
  secret?: string;

  @Column("simple-array", { nullable: false })
  allowedGrants!: GrantIdentifier[];

  @Column({ nullable: false })
  name!: string;

  @Column("simple-array", { nullable: false })
  redirectUris!: string[];

  @ManyToMany(() => OAuthScopeImp)
  @JoinTable()
  scopes!: OAuthScopeImp[];
}
