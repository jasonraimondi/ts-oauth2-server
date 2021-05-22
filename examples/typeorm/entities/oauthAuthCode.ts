import { Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { OAuthAuthCode } from "../../../src";
import OAuthScopeImp from "./oauthScope";
import OAuthClientImp from "./oauthClient";
import OAuthUserImp from "./oauthUser";

@Entity("oauth_auth_code")
export default class OAuthAuthCodeImp implements OAuthAuthCode {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ nullable: false })
  clientId!: string;

  @ManyToOne(() => OAuthClientImp, undefined)
  @JoinColumn({ name: "clientId", referencedColumnName: "id" })
  client!: OAuthClientImp;

  @Column({ nullable: false, unique: true })
  code!: string;

  @Column({ nullable: true, default: null })
  codeChallenge?: string;

  @Column({ nullable: true, default: null })
  codeChallengeMethod?: string;

  @Column({ nullable: false })
  expiresAt!: Date;

  @Column({ nullable: true, default: null })
  redirectUri?: string;

  @ManyToMany(() => OAuthScopeImp)
  @JoinTable()
  scopes!: OAuthScopeImp[];

  @Column({ nullable: true, default: null })
  userId?: string;

  @ManyToOne(() => OAuthUserImp, undefined)
  @JoinColumn({ name: "userId", referencedColumnName: "id" })
  user?: OAuthUserImp;
}
