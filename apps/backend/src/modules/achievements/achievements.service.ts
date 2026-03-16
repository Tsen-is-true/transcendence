import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Achievement } from './entities/achievement.entity';
import { UserAchievement } from './entities/user-achievement.entity';
import { Tournament } from '@modules/tournaments/entities/tournament.entity';
import { UsersService } from '@modules/users/users.service';

const SEED_ACHIEVEMENTS = [
  {
    name: 'first_win',
    displayName: '첫 승리',
    description: '첫 번째 게임에서 승리하세요',
    condition: 'wins',
    threshold: 1,
  },
  {
    name: 'ten_games',
    displayName: '10게임 완료',
    description: '총 10게임을 플레이하세요',
    condition: 'games',
    threshold: 10,
  },
  {
    name: 'three_streak',
    displayName: '3연승',
    description: '3연승을 달성하세요',
    condition: 'streak',
    threshold: 3,
  },
  {
    name: 'five_streak',
    displayName: '5연승',
    description: '5연승을 달성하세요',
    condition: 'streak',
    threshold: 5,
  },
  {
    name: 'elo_1200',
    displayName: 'ELO 1200',
    description: 'ELO 1200에 도달하세요',
    condition: 'elo',
    threshold: 1200,
  },
  {
    name: 'elo_1500',
    displayName: 'ELO 1500',
    description: 'ELO 1500에 도달하세요',
    condition: 'elo',
    threshold: 1500,
  },
  {
    name: 'tournament_winner',
    displayName: '토너먼트 우승',
    description: '토너먼트에서 우승하세요',
    condition: 'tournament_wins',
    threshold: 1,
  },
  {
    name: 'fifty_wins',
    displayName: '50승',
    description: '총 50승을 달성하세요',
    condition: 'wins',
    threshold: 50,
  },
];

@Injectable()
export class AchievementsService implements OnModuleInit {
  constructor(
    @InjectRepository(Achievement)
    private readonly achievementRepo: Repository<Achievement>,
    @InjectRepository(UserAchievement)
    private readonly userAchievementRepo: Repository<UserAchievement>,
    @InjectRepository(Tournament)
    private readonly tournamentRepo: Repository<Tournament>,
    private readonly usersService: UsersService,
  ) {}

  async onModuleInit() {
    await this.seedAchievements();
  }

  private async seedAchievements() {
    for (const seed of SEED_ACHIEVEMENTS) {
      const exists = await this.achievementRepo.findOne({
        where: { name: seed.name },
      });
      if (!exists) {
        await this.achievementRepo.save(seed);
      }
    }
  }

  async checkAchievements(userId: number): Promise<Achievement[]> {
    const user = await this.usersService.findById(userId);
    if (!user) return [];

    const allAchievements = await this.achievementRepo.find();
    const unlocked = await this.userAchievementRepo.find({
      where: { userId },
    });
    const unlockedIds = new Set(unlocked.map((u) => u.achievementId));

    const newlyUnlocked: Achievement[] = [];

    for (const achievement of allAchievements) {
      if (unlockedIds.has(achievement.achievementId)) continue;

      const met = await this.isConditionMet(user, achievement);
      if (met) {
        await this.userAchievementRepo.save({
          userId,
          achievementId: achievement.achievementId,
        });
        newlyUnlocked.push(achievement);
      }
    }

    return newlyUnlocked;
  }

  private async isConditionMet(
    user: any,
    achievement: Achievement,
  ): Promise<boolean> {
    switch (achievement.condition) {
      case 'wins':
        return user.wins >= achievement.threshold;
      case 'games':
        return user.wins + user.loses >= achievement.threshold;
      case 'streak':
        return user.maxStreak >= achievement.threshold;
      case 'elo':
        return user.elo >= achievement.threshold;
      case 'tournament_wins': {
        const count = await this.tournamentRepo.count({
          where: { winnerId: user.userid, isFinish: true },
        });
        return count >= achievement.threshold;
      }
      default:
        return false;
    }
  }

  async getUserAchievements(userId: number) {
    const allAchievements = await this.achievementRepo.find({
      order: { achievementId: 'ASC' },
    });
    const unlocked = await this.userAchievementRepo.find({
      where: { userId },
    });
    const unlockedMap = new Map(
      unlocked.map((u) => [u.achievementId, u.unlockedAt]),
    );

    return allAchievements.map((a) => ({
      achievementId: a.achievementId,
      name: a.name,
      displayName: a.displayName,
      description: a.description,
      icon: a.icon,
      unlocked: unlockedMap.has(a.achievementId),
      unlockedAt: unlockedMap.get(a.achievementId) ?? null,
    }));
  }
}
