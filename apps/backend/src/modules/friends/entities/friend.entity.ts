import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum FriendStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  BLOCKED = 'blocked',
}

@Entity('friends')
export class Friend {
  @PrimaryGeneratedColumn()
  friendshipId!: number;

  @Column({ type: 'int' })
  requesterId!: number;

  @Column({ type: 'int' })
  addresseeId!: number;

  @Column({ type: 'enum', enum: FriendStatus, default: FriendStatus.PENDING })
  status!: FriendStatus;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
