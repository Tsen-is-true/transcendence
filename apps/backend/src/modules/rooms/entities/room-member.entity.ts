import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('room_members')
export class RoomMember {
  @PrimaryGeneratedColumn()
  roomMemberId!: number;

  @Column({ type: 'int' })
  roomId!: number;

  @Column({ type: 'int' })
  userId!: number;

  @Column({ type: 'boolean', default: false })
  isReady!: boolean;

  @CreateDateColumn()
  joinedAt!: Date;
}
