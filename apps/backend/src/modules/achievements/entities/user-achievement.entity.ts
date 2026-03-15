import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('user_achievements')
export class UserAchievement {
  @PrimaryGeneratedColumn()
  userAchievementId!: number;

  @Column({ type: 'int' })
  userId!: number;

  @Column({ type: 'int' })
  achievementId!: number;

  @CreateDateColumn()
  unlockedAt!: Date;
}
