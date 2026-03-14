import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('tournaments')
export class Tournament {
  @PrimaryGeneratedColumn()
  tournamentId!: number;

  @Column({ type: 'int' })
  roomId!: number;

  @Column({ type: 'boolean', default: false })
  isFinish!: boolean;

  @Column({ type: 'int', nullable: true })
  winnerId!: number | null;

  @Column({ type: 'int', default: 1 })
  currentRound!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
