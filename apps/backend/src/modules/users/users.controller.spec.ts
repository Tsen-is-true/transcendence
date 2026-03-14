import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: Record<string, jest.Mock>;

  beforeEach(async () => {
    usersService = {
      getProfile: jest.fn(),
      getPublicProfile: jest.fn(),
      findByNickname: jest.fn(),
      update: jest.fn(),
      getUserStats: jest.fn(),
      getMatchHistory: jest.fn(),
      search: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  describe('getMyProfile', () => {
    it('should return profile when user exists', async () => {
      const profile = { userid: 1, nickname: 'alice' };
      usersService.getProfile.mockResolvedValue(profile as any);

      const result = await controller.getMyProfile(1);

      expect(usersService.getProfile).toHaveBeenCalledWith(1);
      expect(result).toEqual(profile);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      usersService.getProfile.mockResolvedValue(null as any);

      await expect(controller.getMyProfile(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateMyProfile', () => {
    it('should update and return the updated profile', async () => {
      const updated = { userid: 1, nickname: 'new-nick' };
      usersService.findByNickname.mockResolvedValue(null as any);
      usersService.update.mockResolvedValue(undefined as any);
      usersService.getProfile.mockResolvedValue(updated as any);

      const result = await controller.updateMyProfile(1, {
        nickname: 'new-nick',
      });

      expect(usersService.findByNickname).toHaveBeenCalledWith('new-nick');
      expect(usersService.update).toHaveBeenCalledWith(1, {
        nickname: 'new-nick',
      });
      expect(result).toEqual(updated);
    });

    it('should throw ConflictException when nickname is taken by another user', async () => {
      usersService.findByNickname.mockResolvedValue({
        userid: 2,
        nickname: 'taken',
      } as any);

      await expect(
        controller.updateMyProfile(1, { nickname: 'taken' }),
      ).rejects.toThrow(ConflictException);

      expect(usersService.update).not.toHaveBeenCalled();
    });

    it('should allow keeping own nickname', async () => {
      const profile = { userid: 1, nickname: 'mine' };
      usersService.findByNickname.mockResolvedValue({
        userid: 1,
        nickname: 'mine',
      } as any);
      usersService.update.mockResolvedValue(undefined as any);
      usersService.getProfile.mockResolvedValue(profile as any);

      const result = await controller.updateMyProfile(1, {
        nickname: 'mine',
      });

      expect(usersService.update).toHaveBeenCalledWith(1, {
        nickname: 'mine',
      });
      expect(result).toEqual(profile);
    });
  });

  describe('getUserStats', () => {
    it('should return stats when user exists', async () => {
      const stats = { userid: 1, wins: 10, losses: 5 };
      usersService.getUserStats.mockResolvedValue(stats as any);

      const result = await controller.getUserStats(1);

      expect(usersService.getUserStats).toHaveBeenCalledWith(1);
      expect(result).toEqual(stats);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      usersService.getUserStats.mockResolvedValue(null as any);

      await expect(controller.getUserStats(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getUserProfile', () => {
    it('should return public profile when user exists', async () => {
      const profile = { userid: 1, nickname: 'alice' };
      usersService.getPublicProfile.mockResolvedValue(profile as any);

      const result = await controller.getUserProfile(1);

      expect(usersService.getPublicProfile).toHaveBeenCalledWith(1);
      expect(result).toEqual(profile);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      usersService.getPublicProfile.mockResolvedValue(null as any);

      await expect(controller.getUserProfile(999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('searchUsers', () => {
    it('should call search with provided params', async () => {
      const results = [{ userid: 1, nickname: 'alice' }];
      usersService.search.mockResolvedValue(results as any);

      const result = await controller.searchUsers({
        search: 'ali',
        page: 1,
        limit: 10,
      });

      expect(usersService.search).toHaveBeenCalledWith('ali', 1, 10);
      expect(result).toEqual(results);
    });

    it('should default search to empty string when not provided', async () => {
      usersService.search.mockResolvedValue([] as any);

      await controller.searchUsers({
        search: undefined,
        page: 1,
        limit: 10,
      } as any);

      expect(usersService.search).toHaveBeenCalledWith('', 1, 10);
    });
  });

  describe('getMatchHistory', () => {
    it('should call getMatchHistory with correct params', async () => {
      const matches = [{ matchid: 1 }];
      usersService.getMatchHistory.mockResolvedValue(matches as any);

      const result = await controller.getMatchHistory(1, {
        page: 2,
        limit: 5,
        type: 'ranked',
      } as any);

      expect(usersService.getMatchHistory).toHaveBeenCalledWith(
        1,
        2,
        5,
        'ranked',
      );
      expect(result).toEqual(matches);
    });
  });
});
