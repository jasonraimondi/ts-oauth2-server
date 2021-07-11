import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import { OAuthScope } from "@jmondi/oauth2-server";

@Entity("oauth_scopes")
export class Scope implements OAuthScope {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column()
  name!: string;

  @Column({ nullable: true })
  description?: string;
}
