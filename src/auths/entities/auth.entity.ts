import { User } from '@/users/entities/user.entity';
import { Exclude } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Auth {
  @PrimaryColumn()
  id: number;

  @Column({ type: 'varchar', nullable: false })
  @Exclude()
  password: string;

  @Column({ type: 'varchar', unique: true, nullable: false })
  email: string;

  @OneToOne(() => User, (user) => user.auth, {
    onDelete: 'CASCADE',
    cascade: true,
  })
  @JoinColumn({ name: 'id' })
  user: User;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
