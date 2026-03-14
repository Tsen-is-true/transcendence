import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PublicApiController } from './public-api.controller';
import { UsersService } from '@modules/users/users.service';
import { ApiKeyGuard } from '@common/guards/api-key.guard';
import { ApiKeyThrottleGuard } from '@common/guards/api-key-throttle.guard';

describe('PublicApiController', () => {
  let controller: PublicApiController;

  const mockUsersService: Record<string, jest.Mock> = {
    getMatchHistory: jest.fn(),
    getLeaderboard: jest.fn(),
    getUserStats: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicApiController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    })
      .overrideGuard(ApiKeyGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(ApiKeyThrottleGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PublicApiController>(PublicApiController);
    jest.clearAllMocks();
  });

  describe('getMatches', () => {
    it('should return match history for valid userId', async () => {
      const mockResult = { data: [], total: 0 };
      mockUsersService.getMatchHistory.mockResolvedValue(mockResult);

      const dto = { userId: 1, page: 1, limit: 10, type: 'all' };
      const result = await controller.getMatches(dto as any);

      expect(mockUsersService.getMatchHistory).toHaveBeenCalledWith(1, 1, 10, 'all');
      expect(result).toEqual(mockResult);
    });

    it('should throw BadRequestException when userId is missing', async () => {
      const dto = { page: 1, limit: 10, type: 'all' };

      await expect(controller.getMatches(dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getLeaderboard', () => {
    it('should return leaderboard data', async () => {
      const mockResult = [{ userId: 1, elo: 1500 }];
      mockUsersService.getLeaderboard.mockResolvedValue(mockResult);

      const dto = { type: 'elo', limit: 10 };
      const result = await controller.getLeaderboard(dto as any);

      expect(mockUsersService.getLeaderboard).toHaveBeenCalledWith('elo', 10);
      expect(result).toEqual(mockResult);
    });
  });

  describe('getUserStats', () => {
    it('should return user stats for valid id', async () => {
      const mockResult = { userId: 1, wins: 10, loses: 5, elo: 1200 };
      mockUsersService.getUserStats.mockResolvedValue(mockResult);

      const result = await controller.getUserStats(1);

      expect(mockUsersService.getUserStats).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockResult);
    });

    it('should throw NotFoundException when stats are null', async () => {
      mockUsersService.getUserStats.mockResolvedValue(null);

      await expect(controller.getUserStats(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
