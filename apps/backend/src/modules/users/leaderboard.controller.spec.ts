import { Test, TestingModule } from '@nestjs/testing';
import { LeaderboardController } from './leaderboard.controller';
import { UsersService } from './users.service';

describe('LeaderboardController', () => {
  let controller: LeaderboardController;
  let usersService: Record<string, jest.Mock>;

  beforeEach(async () => {
    usersService = {
      getLeaderboard: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LeaderboardController],
      providers: [{ provide: UsersService, useValue: usersService }],
    }).compile();

    controller = module.get<LeaderboardController>(LeaderboardController);
  });

  describe('getLeaderboard', () => {
    it('should call usersService.getLeaderboard with correct params and return result', async () => {
      const leaderboard = [
        { userid: 1, nickname: 'alice', elo: 1500 },
        { userid: 2, nickname: 'bob', elo: 1400 },
      ];
      usersService.getLeaderboard.mockResolvedValue(leaderboard as any);

      const result = await controller.getLeaderboard({
        type: 'elo',
        limit: 10,
      } as any);

      expect(usersService.getLeaderboard).toHaveBeenCalledWith('elo', 10);
      expect(result).toEqual(leaderboard);
    });

    it('should pass different type and limit values correctly', async () => {
      usersService.getLeaderboard.mockResolvedValue([] as any);

      await controller.getLeaderboard({
        type: 'wins',
        limit: 50,
      } as any);

      expect(usersService.getLeaderboard).toHaveBeenCalledWith('wins', 50);
    });
  });
});
