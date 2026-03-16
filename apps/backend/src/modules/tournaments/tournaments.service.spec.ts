import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { TournamentsService } from './tournaments.service';
import { Tournament } from './entities/tournament.entity';
import { TournamentParticipant } from './entities/tournament-participant.entity';
import { Match } from '@modules/game/entities/match.entity';
import { Score } from '@modules/game/entities/score.entity';
import { UsersService } from '@modules/users/users.service';

describe('TournamentsService', () => {
  let service: TournamentsService;

  const mockTournamentRepo: Record<string, jest.Mock> = {
    findOne: jest.fn(),
  };

  const mockParticipantRepo: Record<string, jest.Mock> = {
    find: jest.fn(),
  };

  const mockMatchRepo: Record<string, jest.Mock> = {
    find: jest.fn(),
  };

  const mockScoreRepo: Record<string, jest.Mock> = {
    findOne: jest.fn(),
  };

  const mockUsersService: Record<string, jest.Mock> = {
    getPublicProfile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TournamentsService,
        {
          provide: getRepositoryToken(Tournament),
          useValue: mockTournamentRepo,
        },
        {
          provide: getRepositoryToken(TournamentParticipant),
          useValue: mockParticipantRepo,
        },
        {
          provide: getRepositoryToken(Match),
          useValue: mockMatchRepo,
        },
        {
          provide: getRepositoryToken(Score),
          useValue: mockScoreRepo,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    service = module.get<TournamentsService>(TournamentsService);
    jest.clearAllMocks();
  });

  // ─── getTournamentBracket ─────────────────────────────────────

  describe('getTournamentBracket', () => {
    it('should return full bracket data for a valid tournament', async () => {
      const tournament = {
        tournamentId: 1,
        roomId: 10,
        currentRound: 2,
        isFinish: false,
        winnerId: null,
      };

      const participants = [
        { userId: 100, status: 'active', joinedAt: new Date() },
        { userId: 200, status: 'active', joinedAt: new Date() },
      ];

      const matches = [
        {
          matchId: 1,
          round: 1,
          matchOrder: 1,
          status: 'finished',
          nextMatchId: null,
          player1Id: 100,
          player2Id: 200,
          winnerId: 100,
        },
      ];

      const userProfile100 = { userid: 100, nickname: 'Alice', avatarUrl: 'a.png' };
      const userProfile200 = { userid: 200, nickname: 'Bob', avatarUrl: 'b.png' };

      mockTournamentRepo.findOne.mockResolvedValue(tournament);
      mockParticipantRepo.find.mockResolvedValue(participants);
      mockMatchRepo.find.mockResolvedValue(matches);
      mockScoreRepo.findOne.mockResolvedValue({ player1Score: 5, player2Score: 3 });
      mockUsersService.getPublicProfile.mockImplementation((userId: number) => {
        if (userId === 100) return Promise.resolve(userProfile100);
        if (userId === 200) return Promise.resolve(userProfile200);
        return Promise.resolve(null);
      });

      const result = await service.getTournamentBracket(1);

      expect(result.tournamentId).toBe(1);
      expect(result.roomId).toBe(10);
      expect(result.currentRound).toBe(2);
      expect(result.isFinish).toBe(false);
      expect(result.winner).toBeNull();
      expect(result.participants).toHaveLength(2);
      expect(result.participants[0]).toEqual({
        userId: 100,
        status: 'active',
        nickname: 'Alice',
        avatarUrl: 'a.png',
      });
      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].player1).toEqual({ userId: 100, nickname: 'Alice' });
      expect(result.matches[0].player2).toEqual({ userId: 200, nickname: 'Bob' });
      expect(result.matches[0].winner).toEqual({ userId: 100, nickname: 'Alice' });
      expect(result.matches[0].score).toEqual({ player1Score: 5, player2Score: 3 });
    });

    it('should throw NotFoundException when tournament does not exist', async () => {
      mockTournamentRepo.findOne.mockResolvedValue(null);

      await expect(service.getTournamentBracket(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
