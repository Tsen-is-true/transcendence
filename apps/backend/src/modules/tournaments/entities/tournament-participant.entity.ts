import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum ParticipantStatus {
  ACTIVE = 'active',
  ELIMINATED = 'eliminated',
  WINNER = 'winner',
}

@Entity('tournament_participants')
export class TournamentParticipant {
  @PrimaryGeneratedColumn()
  tournamentParticipantId!: number;

  @Column({ type: 'int' })
  tournamentId!: number;

  @Column({ type: 'int' })
  userId!: number;

  @Column({
    type: 'enum',
    enum: ParticipantStatus,
    default: ParticipantStatus.ACTIVE,
  })
  status!: ParticipantStatus;

  @CreateDateColumn()
  joinedAt!: Date;
}
