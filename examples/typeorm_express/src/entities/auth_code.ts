import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryColumn,
} from "typeorm";
import { CodeChallengeMethod, OAuthAuthCode } from "@jmondi/oauth2-server";

import { Client } from "./client";
import { Scope } from "./scope";
import { User } from "./user";

@Entity("oauth_auth_codes")
export class AuthCode implements OAuthAuthCode {
  @PrimaryColumn("varchar", { length: 128 })
  // @Length(64, 128)
  code!: string;

  @ManyToOne(() => User, { nullable: true, onDelete: "CASCADE", onUpdate: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user?: User;

  @Index()
  @Column("uuid", { nullable: true })
  // @IsUUID()
  userId?: string;

  @ManyToOne(() => Client)
  @JoinColumn({ name: "clientId" })
  client!: Client;

  @Index()
  @Column("uuid")
  // @IsUUID()
  clientId!: string;

  @Column({ nullable: true })
  redirectUri?: string;

  @Column("varchar", { nullable: true, length: 128 })
  codeChallenge?: string;

  @Column("varchar", { nullable: true, length: 128 })
  // @IsOptional()
  // @IsIn(["S256", "plain"])
  codeChallengeMethod?: CodeChallengeMethod;

  @Column()
  expiresAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToMany(() => Scope, { onDelete: "CASCADE", onUpdate: "CASCADE" })
  @JoinTable({
    name: "oauth_auth_code_scopes",
    joinColumn: { name: "authCodeCode", referencedColumnName: "code" },
    inverseJoinColumn: { name: "scopeId", referencedColumnName: "id" },
  })
  scopes!: Scope[];

  revoke() {
    this.expiresAt = new Date(0);
  }

  get isExpired(): boolean {
    console.log(new Date(), this.expiresAt);
    return new Date() > this.expiresAt;
  }
}
