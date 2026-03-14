import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum RoomStatus {
  WAITING = 'waiting',
  PLAYING = 'playing',
  FINISHED = 'finished',
}

@Entity('rooms')
export class Room {
  @PrimaryGeneratedColumn()
  roomId!: number;

  @Column({ type: 'int' })
  hostUserId!: number;

  @Column({ type: 'varchar', length: 100 })
  title!: string;

  @Column({ type: 'enum', enum: RoomStatus, default: RoomStatus.WAITING })
  status!: RoomStatus;

  @Column({ type: 'boolean', default: false })
  isTournament!: boolean;

  @Column({ type: 'int', default: 0 })
  countPlayers!: number;

  @Column({ type: 'int' })
  maxPlayers!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
