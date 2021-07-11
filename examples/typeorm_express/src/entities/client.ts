import { Column, CreateDateColumn, Entity, JoinTable, ManyToMany, PrimaryColumn } from "typeorm";
import { GrantIdentifier, OAuthClient } from "@jmondi/oauth2-server";

import { Scope } from "./scope";

@Entity("oauth_clients")
export class Client implements OAuthClient {
  @PrimaryColumn("uuid")
  readonly id!: string;

  @Column("varchar", { length: 128, nullable: true })
  // @Length(64, 128)
  // @IsOptional()
  secret?: string;

  @Column("varchar", { length: 128 })
  name!: string;

  @Column("simple-array")
  redirectUris!: string[];

  @Column("simple-array")
  allowedGrants!: GrantIdentifier[];

  @ManyToMany(() => Scope, { onDelete: "CASCADE", onUpdate: "CASCADE" })
  @JoinTable({
    name: "oauth_client_scopes",
    joinColumn: { name: "clientId", referencedColumnName: "id" },
    inverseJoinColumn: { name: "scopeId", referencedColumnName: "id" },
  })
  scopes!: Scope[];

  @CreateDateColumn()
  createdAt!: Date;
}
