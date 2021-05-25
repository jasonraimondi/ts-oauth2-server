import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";
import { OAuthUser } from "../../../../src";

@Entity()
export class User implements OAuthUser {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  firstName!: string;

  @Column()
  lastName!: string;

  @Column({ unique: true })
  email!: string;
}
