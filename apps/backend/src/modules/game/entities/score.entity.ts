import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('scores')
export class Score {
  @PrimaryGeneratedColumn()
  scoreId!: number;

  @Column({ type: 'int' })
  matchId!: number;

  @Column({ type: 'int', default: 0 })
  player1Score!: number;

  @Column({ type: 'int', default: 0 })
  player2Score!: number;

  @CreateDateColumn()
  createdAt!: Date;
}
