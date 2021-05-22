import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { OAuthScope } from "../../../src";

@Entity("oauth_scope")
export default class OAuthScopeImp implements OAuthScope {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ nullable: false })
  name!: string;
}
