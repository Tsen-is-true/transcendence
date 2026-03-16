import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AchievementsService } from './achievements.service';
import { Achievement } from './entities/achievement.entity';
import { UserAchievement } from './entities/user-achievement.entity';
import { Tournament } from '@modules/tournaments/entities/tournament.entity';
import { UsersService } from '@modules/users/users.service';

describe('AchievementsService', () => {
  let service: AchievementsService;

  const mockAchievementRepo: Record<string, jest.Mock> = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockUserAchievementRepo: Record<string, jest.Mock> = {
    find: jest.fn(),
    save: jest.fn(),
  };

  const mockTournamentRepo: Record<string, jest.Mock> = {
    count: jest.fn(),
  };

  const mockUsersService: Record<string, jest.Mock> = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AchievementsService,
        {
          provide: getRepositoryToken(Achievement),
          useValue: mockAchievementRepo,
        },
        {
          provide: getRepositoryToken(UserAchievement),
          useValue: mockUserAchievementRepo,
        },
        {
          provide: getRepositoryToken(Tournament),
          useValue: mockTournamentRepo,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    service = module.get<AchievementsService>(AchievementsService);
    jest.clearAllMocks();
  });

  // ─── checkAchievements ────────────────────────────────────────

  describe('checkAchievements', () => {
    it('should unlock first_win when user has wins >= 1', async () => {
      const user = { userid: 1, wins: 1, loses: 0, maxStreak: 1, elo: 1000 };
      const firstWin = {
        achievementId: 1,
        name: 'first_win',
        condition: 'wins',
        threshold: 1,
      };

      mockUsersService.findById.mockResolvedValue(user);
      mockAchievementRepo.find.mockResolvedValue([firstWin]);
      mockUserAchievementRepo.find.mockResolvedValue([]);
      mockUserAchievementRepo.save.mockResolvedValue({});

      const result = await service.checkAchievements(1);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('first_win');
      expect(mockUserAchievementRepo.save).toHaveBeenCalledWith({
        userId: 1,
        achievementId: 1,
      });
    });

    it('should not re-unlock an already unlocked achievement', async () => {
      const user = { userid: 1, wins: 5, loses: 0, maxStreak: 5, elo: 1000 };
      const firstWin = {
        achievementId: 1,
        name: 'first_win',
        condition: 'wins',
        threshold: 1,
      };

      mockUsersService.findById.mockResolvedValue(user);
      mockAchievementRepo.find.mockResolvedValue([firstWin]);
      mockUserAchievementRepo.find.mockResolvedValue([
        { userId: 1, achievementId: 1 },
      ]);

      const result = await service.checkAchievements(1);

      expect(result).toHaveLength(0);
      expect(mockUserAchievementRepo.save).not.toHaveBeenCalled();
    });

    it('should return empty array when user is not found', async () => {
      mockUsersService.findById.mockResolvedValue(null);

      const result = await service.checkAchievements(999);

      expect(result).toEqual([]);
    });
  });

  // ─── getUserAchievements ──────────────────────────────────────

  describe('getUserAchievements', () => {
    it('should return all achievements with unlocked status', async () => {
      const achievements = [
        {
          achievementId: 1,
          name: 'first_win',
          displayName: '첫 승리',
          description: '첫 번째 게임에서 승리하세요',
          icon: null,
        },
        {
          achievementId: 2,
          name: 'ten_games',
          displayName: '10게임 완료',
          description: '총 10게임을 플레이하세요',
          icon: null,
        },
      ];

      const unlockedAt = new Date('2026-01-01');
      mockAchievementRepo.find.mockResolvedValue(achievements);
      mockUserAchievementRepo.find.mockResolvedValue([
        { userId: 1, achievementId: 1, unlockedAt },
      ]);

      const result = await service.getUserAchievements(1);

      expect(result).toHaveLength(2);
      expect(result[0].unlocked).toBe(true);
      expect(result[0].unlockedAt).toEqual(unlockedAt);
      expect(result[1].unlocked).toBe(false);
      expect(result[1].unlockedAt).toBeNull();
    });
  });

  // ─── seedAchievements (via onModuleInit) ──────────────────────

  describe('onModuleInit', () => {
    it('should create achievements that do not already exist', async () => {
      mockAchievementRepo.findOne.mockResolvedValue(null);
      mockAchievementRepo.save.mockResolvedValue({});

      await service.onModuleInit();

      // SEED_ACHIEVEMENTS has 8 items
      expect(mockAchievementRepo.findOne).toHaveBeenCalledTimes(8);
      expect(mockAchievementRepo.save).toHaveBeenCalledTimes(8);
    });

    it('should skip achievements that already exist', async () => {
      mockAchievementRepo.findOne.mockResolvedValue({ achievementId: 1 });
      mockAchievementRepo.save.mockResolvedValue({});

      await service.onModuleInit();

      expect(mockAchievementRepo.findOne).toHaveBeenCalledTimes(8);
      expect(mockAchievementRepo.save).not.toHaveBeenCalled();
    });
  });
});
