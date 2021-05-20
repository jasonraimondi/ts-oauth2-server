import { Column, Entity, Index, JoinColumn, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { OAuthToken } from "../../../src";
import OAuthClientImp from "./oauthClient";
import OAuthScopeImp from "./oauthScope";
import OAuthUserImp from "./oauthUser";

@Entity("oauth_token")
export default class OAuthTokenImp implements OAuthToken {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ nullable: false })
  clientId!: string;

  @ManyToOne(() => OAuthClientImp, undefined)
  @JoinColumn({ name: "clientId", referencedColumnName: "id" })
  client!: OAuthClientImp;

  @Index()
  @Column("varchar", { nullable: false, length: 2000 })
  accessToken!: string;

  @Column({ nullable: false })
  accessTokenExpiresAt!: Date;

  @Index()
  @Column("varchar", { nullable: true, default: null, length: 2000 })
  refreshToken?: string;

  @Column({ nullable: true, default: null })
  refreshTokenExpiresAt?: Date;

  @ManyToMany(() => OAuthScopeImp)
  @JoinTable()
  scopes!: OAuthScopeImp[];

  @Column({ nullable: true, default: null })
  userId?: string;

  @ManyToOne(() => OAuthUserImp, undefined)
  @JoinColumn({ name: "userId", referencedColumnName: "id" })
  user?: OAuthUserImp;
}
