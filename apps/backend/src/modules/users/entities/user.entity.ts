import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  userid!: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  intraId!: string | null;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  password!: string | null;

  @Column({ type: 'varchar', length: 50 })
  nickname!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  avatarUrl!: string | null;

  @Column({ type: 'int', default: 0 })
  wins!: number;

  @Column({ type: 'int', default: 0 })
  loses!: number;

  @Column({ type: 'int', default: 1000 })
  elo!: number;

  @Column({ type: 'int', default: 1 })
  level!: number;

  @Column({ type: 'int', default: 0 })
  xp!: number;

  @Column({ type: 'int', default: 0 })
  streak!: number;

  @Column({ type: 'int', default: 0 })
  maxStreak!: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  oauthProvider!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  oauthId!: string | null;

  @Column({ type: 'boolean', default: false })
  isPlaying!: boolean;

  @Column({ type: 'boolean', default: false })
  isOnline!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastSeenAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
