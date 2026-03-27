import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

export enum MatchStatus {
  WAITING = 'waiting',
  PLAYING = 'playing',
  FINISHED = 'finished',
  WALKOVER = 'walkover',
  SURRENDER = 'surrender',
}

@Entity('matchs')
export class Match {
  @PrimaryGeneratedColumn()
  matchId!: number;

  @Column({ type: 'int', nullable: true })
  tournamentId!: number | null;

  @Column({ type: 'int' })
  roomId!: number;

  @Column({ type: 'int', nullable: true })
  player1Id!: number | null;

  @Column({ type: 'int', nullable: true })
  player2Id!: number | null;

  @Column({ type: 'int', nullable: true })
  winnerId!: number | null;

  @Column({ type: 'int' })
  round!: number;

  @Column({ type: 'int' })
  matchOrder!: number;

  @Column({ type: 'int', nullable: true })
  nextMatchId!: number | null;

  @Column({ type: 'enum', enum: MatchStatus, default: MatchStatus.WAITING })
  status!: MatchStatus;

  @Column({ type: 'timestamp', nullable: true })
  startAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  finishAt!: Date | null;
}
