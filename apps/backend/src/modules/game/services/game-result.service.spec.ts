import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { GameResultService } from './game-result.service';
import { Match, MatchStatus } from '../entities/match.entity';
import { Score } from '../entities/score.entity';
import { Room, RoomStatus } from '@modules/rooms/entities/room.entity';
import { Tournament } from '@modules/tournaments/entities/tournament.entity';
import { TournamentParticipant } from '@modules/tournaments/entities/tournament-participant.entity';
import { UsersService } from '@modules/users/users.service';
import { GameState } from '../interfaces/game-state.interface';

describe('GameResultService', () => {
  let service: GameResultService;
  let matchRepo: Partial<Record<string, jest.Mock>>;
  let scoreRepo: Partial<Record<string, jest.Mock>>;
  let roomRepo: Partial<Record<string, jest.Mock>>;
  let tournamentRepo: Partial<Record<string, jest.Mock>>;
  let participantRepo: Partial<Record<string, jest.Mock>>;
  let usersService: Record<string, jest.Mock>;
  let dataSource: Record<string, jest.Mock>;

  const mockGame: GameState = {
    matchId: 1,
    roomId: 10,
    status: 'finished',
    ball: { x: 400, y: 300, velocityX: 5, velocityY: 0, speed: 5 },
    players: {
      player1: {
        userId: 100,
        paddleY: 250,
        score: 11,
        connected: true,
        socketId: 'sock1',
        direction: 'stop',
      },
      player2: {
        userId: 200,
        paddleY: 250,
        score: 5,
        connected: true,
        socketId: 'sock2',
        direction: 'stop',
      },
    },
    rallyCount: 0,
    lastUpdateAt: Date.now(),
  };

  beforeEach(async () => {
    matchRepo = {
      findOne: jest.fn(),
      update: jest.fn(),
      save: jest.fn(),
    };

    scoreRepo = {
      save: jest.fn(),
    };

    roomRepo = {
      update: jest.fn(),
    };

    tournamentRepo = {
      update: jest.fn(),
    };

    participantRepo = {
      update: jest.fn(),
    };

    usersService = {
      findById: jest.fn().mockResolvedValue({
        userid: 100,
        elo: 1000,
        xp: 50,
        level: 1,
        streak: 0,
        maxStreak: 0,
        wins: 0,
        loses: 0,
      }),
    };

    const mockManagerRepoMap: Record<string, Record<string, jest.Mock>> = {};
    mockManagerRepoMap[Match.name] = {
      update: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn().mockResolvedValue(null),
      query: jest.fn(),
    };
    mockManagerRepoMap[Score.name] = {
      save: jest.fn(),
    };
    mockManagerRepoMap[Room.name] = {
      update: jest.fn(),
    };
    mockManagerRepoMap[Tournament.name] = {
      update: jest.fn(),
    };
    mockManagerRepoMap[TournamentParticipant.name] = {
      update: jest.fn(),
    };

    const mockManager = {
      getRepository: jest.fn((entity: any) => {
        return mockManagerRepoMap[entity.name] || {};
      }),
      query: jest.fn(),
    };

    dataSource = {
      transaction: jest.fn((cb: (manager: any) => Promise<void>) =>
        cb(mockManager),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameResultService,
        {
          provide: getRepositoryToken(Match),
          useValue: matchRepo,
        },
        {
          provide: getRepositoryToken(Score),
          useValue: scoreRepo,
        },
        {
          provide: getRepositoryToken(Room),
          useValue: roomRepo,
        },
        {
          provide: getRepositoryToken(Tournament),
          useValue: tournamentRepo,
        },
        {
          provide: getRepositoryToken(TournamentParticipant),
          useValue: participantRepo,
        },
        {
          provide: UsersService,
          useValue: usersService,
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
      ],
    }).compile();

    service = module.get<GameResultService>(GameResultService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processGameEnd', () => {
    it('should call dataSource.transaction', async () => {
      await service.processGameEnd(mockGame, 100);

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('should call achievement check callbacks for winner and loser', async () => {
      const achievementCb = jest.fn();
      service.setOnAchievementCheckCallback(achievementCb);

      await service.processGameEnd(mockGame, 100);

      expect(achievementCb).toHaveBeenCalledTimes(2);
      expect(achievementCb).toHaveBeenCalledWith(100);
      expect(achievementCb).toHaveBeenCalledWith(200);
    });

    it('should not throw when no achievement callback is set', async () => {
      await expect(
        service.processGameEnd(mockGame, 100),
      ).resolves.not.toThrow();
    });

    it('should accept optional status parameter', async () => {
      await expect(
        service.processGameEnd(mockGame, 100, MatchStatus.WALKOVER),
      ).resolves.not.toThrow();

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('setOnFinalReadyCallback', () => {
    it('should store the callback', () => {
      const callback = jest.fn();

      expect(() => {
        service.setOnFinalReadyCallback(callback);
      }).not.toThrow();
    });
  });

  describe('setOnTournamentEventCallback', () => {
    it('should store the callback', () => {
      const callback = jest.fn();

      expect(() => {
        service.setOnTournamentEventCallback(callback);
      }).not.toThrow();
    });
  });

  describe('setOnAchievementCheckCallback', () => {
    it('should store the callback', () => {
      const callback = jest.fn();

      expect(() => {
        service.setOnAchievementCheckCallback(callback);
      }).not.toThrow();
    });

    it('should be called during processGameEnd for both players', async () => {
      const callback = jest.fn();
      service.setOnAchievementCheckCallback(callback);

      await service.processGameEnd(mockGame, 100);

      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback).toHaveBeenNthCalledWith(1, 100);
      expect(callback).toHaveBeenNthCalledWith(2, 200);
    });
  });
});
