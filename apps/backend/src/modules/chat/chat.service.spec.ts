import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChatService } from './chat.service';
import { Message } from './entities/message.entity';
import { UsersService } from '@modules/users/users.service';

describe('ChatService', () => {
  let service: ChatService;

  const mockMessageRepo: Record<string, jest.Mock> = {
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockUsersService: Record<string, jest.Mock> = {
    getPublicProfile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: getRepositoryToken(Message),
          useValue: mockMessageRepo,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
    jest.clearAllMocks();
  });

  // ─── markAsRead ───────────────────────────────────────────────

  describe('markAsRead', () => {
    it('should mark messages as read and return updatedCount', async () => {
      mockMessageRepo.update.mockResolvedValue({ affected: 3 });

      const result = await service.markAsRead(2, 1);

      expect(mockMessageRepo.update).toHaveBeenCalledWith(
        { senderId: 1, receiverId: 2, isRead: false },
        { isRead: true },
      );
      expect(result).toEqual({ updatedCount: 3 });
    });

    it('should return updatedCount 0 when no messages to update', async () => {
      mockMessageRepo.update.mockResolvedValue({ affected: 0 });

      const result = await service.markAsRead(2, 1);

      expect(result).toEqual({ updatedCount: 0 });
    });

    it('should return updatedCount 0 when affected is undefined', async () => {
      mockMessageRepo.update.mockResolvedValue({ affected: undefined });

      const result = await service.markAsRead(2, 1);

      expect(result).toEqual({ updatedCount: 0 });
    });
  });

  // ─── saveMessage ──────────────────────────────────────────────

  describe('saveMessage', () => {
    it('should create and save a message', async () => {
      const created = {
        messageId: 1,
        senderId: 1,
        receiverId: 2,
        content: 'hello',
        isRead: false,
        createdAt: new Date(),
      };
      mockMessageRepo.create.mockReturnValue(created);
      mockMessageRepo.save.mockResolvedValue(created);

      const result = await service.saveMessage(1, 2, 'hello');

      expect(mockMessageRepo.create).toHaveBeenCalledWith({
        senderId: 1,
        receiverId: 2,
        content: 'hello',
      });
      expect(mockMessageRepo.save).toHaveBeenCalledWith(created);
      expect(result).toEqual(created);
    });
  });

  // ─── getConversations ─────────────────────────────────────────

  describe('getConversations', () => {
    it('should return conversation list with partner info, last message, and unread count', async () => {
      const qb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getRawMany: jest.fn(),
        getMany: jest.fn(),
      };
      mockMessageRepo.createQueryBuilder.mockReturnValue(qb);

      qb.getRawMany.mockResolvedValue([
        { partnerId: '2', lastMessageAt: '2026-01-01T00:00:00.000Z' },
      ]);

      const lastMessage = {
        messageId: 10,
        content: 'hi',
        senderId: 2,
        createdAt: new Date('2026-01-01'),
      };
      mockMessageRepo.findOne.mockResolvedValue(lastMessage);
      mockMessageRepo.count.mockResolvedValue(3);
      mockUsersService.getPublicProfile.mockResolvedValue({
        userid: 2,
        nickname: 'partner',
        avatarUrl: 'http://avatar.png',
        isOnline: true,
      });

      const result = await service.getConversations(1);

      expect(mockMessageRepo.createQueryBuilder).toHaveBeenCalledWith('m');
      expect(qb.select).toHaveBeenCalled();
      expect(qb.addSelect).toHaveBeenCalled();
      expect(qb.where).toHaveBeenCalled();
      expect(qb.groupBy).toHaveBeenCalled();
      expect(qb.orderBy).toHaveBeenCalled();
      expect(qb.getRawMany).toHaveBeenCalled();

      expect(mockMessageRepo.findOne).toHaveBeenCalled();
      expect(mockMessageRepo.count).toHaveBeenCalledWith({
        where: { senderId: 2, receiverId: 1, isRead: false },
      });
      expect(mockUsersService.getPublicProfile).toHaveBeenCalledWith(2);

      expect(result).toEqual([
        {
          partner: {
            userId: 2,
            nickname: 'partner',
            avatarUrl: 'http://avatar.png',
            isOnline: true,
          },
          lastMessage: {
            messageId: 10,
            content: 'hi',
            senderId: 2,
            createdAt: lastMessage.createdAt,
          },
          unreadCount: 3,
        },
      ]);
    });

    it('should return null partner when getPublicProfile returns null', async () => {
      const qb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getRawMany: jest.fn(),
        getMany: jest.fn(),
      };
      mockMessageRepo.createQueryBuilder.mockReturnValue(qb);

      qb.getRawMany.mockResolvedValue([
        { partnerId: '99', lastMessageAt: '2026-01-01T00:00:00.000Z' },
      ]);

      mockMessageRepo.findOne.mockResolvedValue(null);
      mockMessageRepo.count.mockResolvedValue(0);
      mockUsersService.getPublicProfile.mockResolvedValue(null);

      const result = await service.getConversations(1);

      expect(result).toEqual([
        {
          partner: null,
          lastMessage: null,
          unreadCount: 0,
        },
      ]);
    });

    it('should return empty array when no conversations exist', async () => {
      const qb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getRawMany: jest.fn(),
        getMany: jest.fn(),
      };
      mockMessageRepo.createQueryBuilder.mockReturnValue(qb);
      qb.getRawMany.mockResolvedValue([]);

      const result = await service.getConversations(1);

      expect(result).toEqual([]);
    });
  });

  // ─── getMessages ──────────────────────────────────────────────

  describe('getMessages', () => {
    it('should return messages in chronological order', async () => {
      const qb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getRawMany: jest.fn(),
        getMany: jest.fn(),
      };
      mockMessageRepo.createQueryBuilder.mockReturnValue(qb);

      // getMany returns DESC order (newest first), reverse() makes it chronological
      const messagesDesc = [
        { messageId: 2, content: 'second', createdAt: new Date('2026-01-02') },
        { messageId: 1, content: 'first', createdAt: new Date('2026-01-01') },
      ];
      qb.getMany.mockResolvedValue(messagesDesc);

      const result = await service.getMessages(1, 2);

      expect(mockMessageRepo.createQueryBuilder).toHaveBeenCalledWith('m');
      expect(qb.where).toHaveBeenCalled();
      expect(qb.orderBy).toHaveBeenCalledWith('m.createdAt', 'DESC');
      expect(qb.take).toHaveBeenCalledWith(50);
      expect(qb.getMany).toHaveBeenCalled();
      expect(qb.andWhere).not.toHaveBeenCalled();

      // Result should be reversed to chronological order (oldest first)
      expect(result[0].messageId).toBe(1);
      expect(result[1].messageId).toBe(2);
    });

    it('should apply before cursor when provided', async () => {
      const qb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getRawMany: jest.fn(),
        getMany: jest.fn(),
      };
      mockMessageRepo.createQueryBuilder.mockReturnValue(qb);
      qb.getMany.mockResolvedValue([]);

      const beforeDate = '2026-01-15T00:00:00.000Z';
      await service.getMessages(1, 2, beforeDate, 20);

      expect(qb.andWhere).toHaveBeenCalledWith('m.createdAt < :before', {
        before: new Date(beforeDate),
      });
      expect(qb.take).toHaveBeenCalledWith(20);
    });

    it('should use default limit of 50', async () => {
      const qb = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getRawMany: jest.fn(),
        getMany: jest.fn(),
      };
      mockMessageRepo.createQueryBuilder.mockReturnValue(qb);
      qb.getMany.mockResolvedValue([]);

      await service.getMessages(1, 2);

      expect(qb.take).toHaveBeenCalledWith(50);
    });
  });
});
