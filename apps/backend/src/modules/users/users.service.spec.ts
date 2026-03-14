import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Like } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { Match } from '@modules/game/entities/match.entity';
import { Score } from '@modules/game/entities/score.entity';

type MockRepository = Partial<Record<string, jest.Mock>>;

const createMockRepository = (): MockRepository => ({
  findOne: jest.fn(),
  find: jest.fn(),
  findAndCount: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const mockUser = (): User =>
  ({
    userid: 1,
    intraId: null,
    email: 'test@example.com',
    password: 'hashed_password',
    nickname: 'tester',
    avatarUrl: 'https://example.com/avatar.png',
    wins: 7,
    loses: 3,
    elo: 1200,
    level: 5,
    xp: 350,
    streak: 3,
    maxStreak: 5,
    oauthProvider: null,
    oauthId: null,
    hashedRefreshToken: 'hashed_token',
    isPlaying: false,
    isOnline: true,
    lastSeenAt: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-06-01'),
  }) as User;

describe('UsersService', () => {
  let service: UsersService;
  let userRepo: MockRepository;
  let matchRepo: MockRepository;
  let scoreRepo: MockRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(Match),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(Score),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepo = module.get(getRepositoryToken(User));
    matchRepo = module.get(getRepositoryToken(Match));
    scoreRepo = module.get(getRepositoryToken(Score));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── Basic delegation methods ──────────────────────────────────

  describe('findByEmail', () => {
    it('should call userRepo.findOne with the email', async () => {
      const user = mockUser();
      userRepo.findOne!.mockResolvedValue(user);

      const result = await service.findByEmail('test@example.com');

      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(result).toEqual(user);
    });

    it('should return null when user is not found', async () => {
      userRepo.findOne!.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findByNickname', () => {
    it('should call userRepo.findOne with the nickname', async () => {
      const user = mockUser();
      userRepo.findOne!.mockResolvedValue(user);

      const result = await service.findByNickname('tester');

      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: { nickname: 'tester' },
      });
      expect(result).toEqual(user);
    });
  });

  describe('findById', () => {
    it('should call userRepo.findOne with the userid', async () => {
      const user = mockUser();
      userRepo.findOne!.mockResolvedValue(user);

      const result = await service.findById(1);

      expect(userRepo.findOne).toHaveBeenCalledWith({
        where: { userid: 1 },
      });
      expect(result).toEqual(user);
    });

    it('should return null when user is not found', async () => {
      userRepo.findOne!.mockResolvedValue(null);

      const result = await service.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create and save a new user', async () => {
      const data: Partial<User> = {
        email: 'new@example.com',
        nickname: 'newuser',
      };
      const createdUser = { ...mockUser(), ...data };

      userRepo.create!.mockReturnValue(createdUser);
      userRepo.save!.mockResolvedValue(createdUser);

      const result = await service.create(data);

      expect(userRepo.create).toHaveBeenCalledWith(data);
      expect(userRepo.save).toHaveBeenCalledWith(createdUser);
      expect(result).toEqual(createdUser);
    });
  });

  describe('update', () => {
    it('should call userRepo.update with userid and data', async () => {
      userRepo.update!.mockResolvedValue(undefined);

      await service.update(1, { nickname: 'updated' });

      expect(userRepo.update).toHaveBeenCalledWith(1, {
        nickname: 'updated',
      });
    });
  });

  // ── getProfile ────────────────────────────────────────────────

  describe('getProfile', () => {
    it('should return profile without password and hashedRefreshToken', async () => {
      const user = mockUser();
      userRepo.findOne!.mockResolvedValue(user);

      const result = await service.getProfile(1);

      expect(result).toBeDefined();
      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('hashedRefreshToken');
      expect(result).toHaveProperty('userid', 1);
      expect(result).toHaveProperty('nickname', 'tester');
      expect(result).toHaveProperty('email', 'test@example.com');
    });

    it('should return null if user is not found', async () => {
      userRepo.findOne!.mockResolvedValue(null);

      const result = await service.getProfile(999);

      expect(result).toBeNull();
    });
  });

  // ── getUserStats ──────────────────────────────────────────────

  describe('getUserStats', () => {
    it('should calculate winRate correctly (7 wins, 3 losses -> 70%)', async () => {
      const user = mockUser(); // wins: 7, loses: 3
      userRepo.findOne!.mockResolvedValue(user);

      const result = await service.getUserStats(1);

      expect(result).toBeDefined();
      expect(result!.totalGames).toBe(10);
      expect(result!.winRate).toBe(70);
    });

    it('should return winRate 0 when totalGames is 0', async () => {
      const user = { ...mockUser(), wins: 0, loses: 0 };
      userRepo.findOne!.mockResolvedValue(user);

      const result = await service.getUserStats(1);

      expect(result!.totalGames).toBe(0);
      expect(result!.winRate).toBe(0);
    });

    it('should calculate xpToNextLevel as level * 100 - xp', async () => {
      const user = mockUser(); // level: 5, xp: 350
      userRepo.findOne!.mockResolvedValue(user);

      const result = await service.getUserStats(1);

      // xpToNextLevel = 5 * 100 - 350 = 150
      expect(result!.xpToNextLevel).toBe(150);
    });

    it('should handle non-round winRate (e.g. 1 win, 2 losses -> 33.3%)', async () => {
      const user = { ...mockUser(), wins: 1, loses: 2 };
      userRepo.findOne!.mockResolvedValue(user);

      const result = await service.getUserStats(1);

      // Math.round((1/3) * 1000) / 10 = Math.round(333.33) / 10 = 333 / 10 = 33.3
      expect(result!.winRate).toBe(33.3);
    });

    it('should return null if user is not found', async () => {
      userRepo.findOne!.mockResolvedValue(null);

      const result = await service.getUserStats(999);

      expect(result).toBeNull();
    });

    it('should return all expected stat fields', async () => {
      const user = mockUser();
      userRepo.findOne!.mockResolvedValue(user);

      const result = await service.getUserStats(1);

      expect(result).toEqual({
        userId: 1,
        nickname: 'tester',
        avatarUrl: 'https://example.com/avatar.png',
        wins: 7,
        loses: 3,
        totalGames: 10,
        winRate: 70,
        elo: 1200,
        level: 5,
        xp: 350,
        xpToNextLevel: 150,
        streak: 3,
        maxStreak: 5,
      });
    });
  });

  // ── search ────────────────────────────────────────────────────

  describe('search', () => {
    it('should call findAndCount with Like query when query is provided', async () => {
      const users = [mockUser()];
      userRepo.findAndCount!.mockResolvedValue([users, 1]);

      const result = await service.search('test', 1, 10);

      expect(userRepo.findAndCount).toHaveBeenCalledWith({
        where: { nickname: Like('%test%') },
        select: ['userid', 'nickname', 'avatarUrl', 'elo', 'level', 'isOnline'],
        skip: 0,
        take: 10,
        order: { nickname: 'ASC' },
      });
      expect(result.users).toEqual(users);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should pass empty where clause when query is empty', async () => {
      userRepo.findAndCount!.mockResolvedValue([[], 0]);

      await service.search('', 1, 10);

      expect(userRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });

    it('should calculate skip correctly for pagination', async () => {
      userRepo.findAndCount!.mockResolvedValue([[], 0]);

      await service.search('test', 3, 5);

      expect(userRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 5 }),
      );
    });

    it('should calculate totalPages correctly', async () => {
      userRepo.findAndCount!.mockResolvedValue([[], 23]);

      const result = await service.search('test', 1, 10);

      expect(result.totalPages).toBe(3); // Math.ceil(23/10)
    });
  });

  // ── getLeaderboard ────────────────────────────────────────────

  describe('getLeaderboard', () => {
    const leaderboardUsers = () => [
      { ...mockUser(), userid: 1, nickname: 'alice', elo: 1500, wins: 20, loses: 5, level: 10 },
      { ...mockUser(), userid: 2, nickname: 'bob', elo: 1400, wins: 15, loses: 8, level: 8 },
      { ...mockUser(), userid: 3, nickname: 'charlie', elo: 1300, wins: 10, loses: 10, level: 6 },
    ];

    it('should return ranked list ordered by elo DESC for elo type', async () => {
      const users = leaderboardUsers();
      userRepo.find!.mockResolvedValue(users);

      const result = await service.getLeaderboard('elo', 10);

      expect(userRepo.find).toHaveBeenCalledWith({
        select: ['userid', 'nickname', 'avatarUrl', 'elo', 'wins', 'loses', 'level'],
        order: { elo: 'DESC' },
        take: 10,
      });
      expect(result).toHaveLength(3);
      expect(result[0].rank).toBe(1);
      expect(result[1].rank).toBe(2);
      expect(result[2].rank).toBe(3);
      expect(result[0].userId).toBe(1);
    });

    it('should use wins DESC order for wins type', async () => {
      userRepo.find!.mockResolvedValue(leaderboardUsers());

      await service.getLeaderboard('wins', 10);

      expect(userRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ order: { wins: 'DESC' } }),
      );
    });

    it('should use level DESC, xp DESC order for level type', async () => {
      userRepo.find!.mockResolvedValue(leaderboardUsers());

      await service.getLeaderboard('level', 10);

      expect(userRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ order: { level: 'DESC', xp: 'DESC' } }),
      );
    });

    it('should default to elo order for unknown type', async () => {
      userRepo.find!.mockResolvedValue(leaderboardUsers());

      await service.getLeaderboard('unknown', 10);

      expect(userRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ order: { elo: 'DESC' } }),
      );
    });

    it('should map users to ranked entries with correct shape', async () => {
      const users = leaderboardUsers();
      userRepo.find!.mockResolvedValue(users);

      const result = await service.getLeaderboard('elo', 10);

      expect(result[0]).toEqual({
        rank: 1,
        userId: 1,
        nickname: 'alice',
        avatarUrl: 'https://example.com/avatar.png',
        elo: 1500,
        wins: 20,
        loses: 5,
        level: 10,
      });
    });

    it('should respect the limit parameter', async () => {
      userRepo.find!.mockResolvedValue([]);

      await service.getLeaderboard('elo', 5);

      expect(userRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 }),
      );
    });
  });
});
