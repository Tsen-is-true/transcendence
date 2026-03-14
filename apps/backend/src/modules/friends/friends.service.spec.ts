import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { FriendsService } from './friends.service';
import { Friend, FriendStatus } from './entities/friend.entity';
import { UsersService } from '../users/users.service';

describe('FriendsService', () => {
  let service: FriendsService;

  const mockFriendRepo: Record<string, jest.Mock> = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const mockUsersService: Record<string, jest.Mock> = {
    findById: jest.fn(),
    getPublicProfile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FriendsService,
        {
          provide: getRepositoryToken(Friend),
          useValue: mockFriendRepo,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    service = module.get<FriendsService>(FriendsService);
    jest.clearAllMocks();
  });

  // ─── sendRequest ───────────────────────────────────────────────

  describe('sendRequest', () => {
    it('should create and save a pending friend request', async () => {
      const created = {
        friendshipId: 1,
        requesterId: 1,
        addresseeId: 2,
        status: FriendStatus.PENDING,
      };
      mockUsersService.findById.mockResolvedValue({ userId: 2 });
      mockFriendRepo.findOne.mockResolvedValue(null);
      mockFriendRepo.create.mockReturnValue(created);
      mockFriendRepo.save.mockResolvedValue(created);

      const result = await service.sendRequest(1, 2);

      expect(mockUsersService.findById).toHaveBeenCalledWith(2);
      expect(mockFriendRepo.create).toHaveBeenCalledWith({
        requesterId: 1,
        addresseeId: 2,
        status: FriendStatus.PENDING,
      });
      expect(mockFriendRepo.save).toHaveBeenCalledWith(created);
      expect(result).toEqual(created);
    });

    it('should throw BadRequestException when sending request to self', async () => {
      await expect(service.sendRequest(1, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when addressee does not exist', async () => {
      mockUsersService.findById.mockResolvedValue(null);

      await expect(service.sendRequest(1, 999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when user is blocked', async () => {
      mockUsersService.findById.mockResolvedValue({ userId: 2 });
      mockFriendRepo.findOne.mockResolvedValue({
        status: FriendStatus.BLOCKED,
      });

      await expect(service.sendRequest(1, 2)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ConflictException when relation already exists', async () => {
      mockUsersService.findById.mockResolvedValue({ userId: 2 });
      mockFriendRepo.findOne.mockResolvedValue({
        status: FriendStatus.PENDING,
      });

      await expect(service.sendRequest(1, 2)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  // ─── accept ────────────────────────────────────────────────────

  describe('accept', () => {
    it('should accept a pending friend request', async () => {
      const friendship = {
        friendshipId: 1,
        requesterId: 1,
        addresseeId: 2,
        status: FriendStatus.PENDING,
      };
      const accepted = { ...friendship, status: FriendStatus.ACCEPTED };

      mockFriendRepo.findOne.mockResolvedValue(friendship);
      mockFriendRepo.save.mockResolvedValue(accepted);

      const result = await service.accept(1, 2);

      expect(friendship.status).toBe(FriendStatus.ACCEPTED);
      expect(mockFriendRepo.save).toHaveBeenCalledWith(friendship);
      expect(result).toEqual(accepted);
    });

    it('should throw NotFoundException when friendship does not exist', async () => {
      mockFriendRepo.findOne.mockResolvedValue(null);

      await expect(service.accept(999, 2)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not the addressee', async () => {
      mockFriendRepo.findOne.mockResolvedValue({
        friendshipId: 1,
        requesterId: 1,
        addresseeId: 2,
        status: FriendStatus.PENDING,
      });

      await expect(service.accept(1, 3)).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when status is not pending', async () => {
      mockFriendRepo.findOne.mockResolvedValue({
        friendshipId: 1,
        requesterId: 1,
        addresseeId: 2,
        status: FriendStatus.ACCEPTED,
      });

      await expect(service.accept(1, 2)).rejects.toThrow(BadRequestException);
    });
  });

  // ─── remove ────────────────────────────────────────────────────

  describe('remove', () => {
    it('should remove the friendship', async () => {
      const friendship = {
        friendshipId: 1,
        requesterId: 1,
        addresseeId: 2,
        status: FriendStatus.ACCEPTED,
      };
      mockFriendRepo.findOne.mockResolvedValue(friendship);
      mockFriendRepo.remove.mockResolvedValue(undefined);

      await service.remove(1, 1);

      expect(mockFriendRepo.remove).toHaveBeenCalledWith(friendship);
    });

    it('should throw NotFoundException when friendship does not exist', async () => {
      mockFriendRepo.findOne.mockResolvedValue(null);

      await expect(service.remove(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not part of the friendship', async () => {
      mockFriendRepo.findOne.mockResolvedValue({
        friendshipId: 1,
        requesterId: 1,
        addresseeId: 2,
        status: FriendStatus.ACCEPTED,
      });

      await expect(service.remove(1, 3)).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── block ─────────────────────────────────────────────────────

  describe('block', () => {
    it('should create a new block when no existing relation', async () => {
      const created = {
        friendshipId: 1,
        requesterId: 1,
        addresseeId: 2,
        status: FriendStatus.BLOCKED,
      };
      mockUsersService.findById.mockResolvedValue({ userId: 2 });
      mockFriendRepo.findOne.mockResolvedValue(null);
      mockFriendRepo.create.mockReturnValue(created);
      mockFriendRepo.save.mockResolvedValue(created);

      const result = await service.block(1, 2);

      expect(mockFriendRepo.create).toHaveBeenCalledWith({
        requesterId: 1,
        addresseeId: 2,
        status: FriendStatus.BLOCKED,
      });
      expect(result).toEqual(created);
    });

    it('should throw BadRequestException when blocking self', async () => {
      await expect(service.block(1, 1)).rejects.toThrow(BadRequestException);
    });

    it('should update existing relation to blocked', async () => {
      const existing = {
        friendshipId: 1,
        requesterId: 2,
        addresseeId: 1,
        status: FriendStatus.ACCEPTED,
      };
      const updated = {
        ...existing,
        requesterId: 1,
        addresseeId: 2,
        status: FriendStatus.BLOCKED,
      };

      mockUsersService.findById.mockResolvedValue({ userId: 2 });
      mockFriendRepo.findOne.mockResolvedValue(existing);
      mockFriendRepo.save.mockResolvedValue(updated);

      const result = await service.block(1, 2);

      expect(existing.status).toBe(FriendStatus.BLOCKED);
      expect(existing.requesterId).toBe(1);
      expect(existing.addresseeId).toBe(2);
      expect(mockFriendRepo.save).toHaveBeenCalledWith(existing);
      expect(result).toEqual(updated);
    });

    it('should throw NotFoundException when addressee does not exist', async () => {
      mockUsersService.findById.mockResolvedValue(null);

      await expect(service.block(1, 999)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── isBlocked ─────────────────────────────────────────────────

  describe('isBlocked', () => {
    it('should return true when the relation is blocked', async () => {
      mockFriendRepo.findOne.mockResolvedValue({
        status: FriendStatus.BLOCKED,
      });

      const result = await service.isBlocked(1, 2);

      expect(result).toBe(true);
    });

    it('should return false when no relation exists', async () => {
      mockFriendRepo.findOne.mockResolvedValue(null);

      const result = await service.isBlocked(1, 2);

      expect(result).toBe(false);
    });

    it('should return false when the relation is not blocked', async () => {
      mockFriendRepo.findOne.mockResolvedValue({
        status: FriendStatus.ACCEPTED,
      });

      const result = await service.isBlocked(1, 2);

      expect(result).toBe(false);
    });
  });

  // ─── getFriendUserIds ──────────────────────────────────────────

  describe('getFriendUserIds', () => {
    it('should return friend user ids for the given user', async () => {
      mockFriendRepo.find.mockResolvedValue([
        { friendshipId: 1, requesterId: 1, addresseeId: 2, status: FriendStatus.ACCEPTED },
        { friendshipId: 2, requesterId: 3, addresseeId: 1, status: FriendStatus.ACCEPTED },
      ]);

      const result = await service.getFriendUserIds(1);

      expect(result).toEqual([2, 3]);
    });

    it('should return empty array when user has no friends', async () => {
      mockFriendRepo.find.mockResolvedValue([]);

      const result = await service.getFriendUserIds(1);

      expect(result).toEqual([]);
    });
  });

  // ─── list ──────────────────────────────────────────────────────

  describe('list', () => {
    it('should return list of friendships for the user', async () => {
      const friendships = [
        { friendshipId: 1, requesterId: 1, addresseeId: 2, status: FriendStatus.ACCEPTED },
      ];
      mockFriendRepo.find.mockResolvedValue(friendships);

      const result = await service.list(1, 'accepted');

      expect(mockFriendRepo.find).toHaveBeenCalledWith({
        where: [
          { requesterId: 1, status: 'accepted' },
          { addresseeId: 1, status: 'accepted' },
        ],
        order: { createdAt: 'DESC' },
      });
      expect(result).toBeDefined();
    });

    it('should default to accepted status', async () => {
      mockFriendRepo.find.mockResolvedValue([]);

      await service.list(1);

      expect(mockFriendRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.arrayContaining([
            expect.objectContaining({ status: 'accepted' }),
          ]),
        }),
      );
    });
  });
});
