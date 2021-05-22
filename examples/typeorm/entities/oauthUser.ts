import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";
import { OAuthUser } from "../../../src";

@Entity()
export default class OAuthUserImp implements OAuthUser {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ nullable: false })
  firstName!: string;

  @Column({ nullable: false })
  lastName!: string;

  @Column({ nullable: false, unique: true })
  mail!: string;
}
