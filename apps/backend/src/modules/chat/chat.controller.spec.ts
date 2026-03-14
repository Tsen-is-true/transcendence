import { Test, TestingModule } from '@nestjs/testing';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

describe('ChatController', () => {
  let controller: ChatController;

  const mockChatService: Record<string, jest.Mock> = {
    getConversations: jest.fn(),
    getMessages: jest.fn(),
    markAsRead: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        {
          provide: ChatService,
          useValue: mockChatService,
        },
      ],
    }).compile();

    controller = module.get<ChatController>(ChatController);
    jest.clearAllMocks();
  });

  // ─── getConversations ─────────────────────────────────────────

  describe('getConversations', () => {
    it('should return conversations for the user', async () => {
      const conversations = [
        {
          partner: { userId: 2, nickname: 'alice', avatarUrl: null, isOnline: true },
          lastMessage: { messageId: 1, content: 'hello', senderId: 2, createdAt: new Date() },
          unreadCount: 1,
        },
      ];
      mockChatService.getConversations.mockResolvedValue(conversations);

      const result = await controller.getConversations(1);

      expect(mockChatService.getConversations).toHaveBeenCalledWith(1);
      expect(result).toEqual(conversations);
    });

    it('should return empty array when no conversations', async () => {
      mockChatService.getConversations.mockResolvedValue([]);

      const result = await controller.getConversations(1);

      expect(result).toEqual([]);
    });
  });

  // ─── getMessages ──────────────────────────────────────────────

  describe('getMessages', () => {
    it('should return messages with default limit', async () => {
      const messages = [
        { messageId: 1, content: 'hi', senderId: 1, createdAt: new Date() },
      ];
      mockChatService.getMessages.mockResolvedValue(messages);

      const dto = { before: undefined, limit: 50 };
      const result = await controller.getMessages(1, 2, dto);

      expect(mockChatService.getMessages).toHaveBeenCalledWith(1, 2, undefined, 50);
      expect(result).toEqual(messages);
    });

    it('should pass before cursor and custom limit', async () => {
      mockChatService.getMessages.mockResolvedValue([]);

      const before = '2026-01-15T00:00:00.000Z';
      const dto = { before, limit: 20 };
      const result = await controller.getMessages(1, 2, dto);

      expect(mockChatService.getMessages).toHaveBeenCalledWith(1, 2, before, 20);
      expect(result).toEqual([]);
    });
  });

  // ─── markAsRead ───────────────────────────────────────────────

  describe('markAsRead', () => {
    it('should mark messages as read and return result', async () => {
      mockChatService.markAsRead.mockResolvedValue({ updatedCount: 5 });

      const result = await controller.markAsRead(1, 2);

      expect(mockChatService.markAsRead).toHaveBeenCalledWith(1, 2);
      expect(result).toEqual({ updatedCount: 5 });
    });

    it('should return updatedCount 0 when nothing to mark', async () => {
      mockChatService.markAsRead.mockResolvedValue({ updatedCount: 0 });

      const result = await controller.markAsRead(1, 2);

      expect(result).toEqual({ updatedCount: 0 });
    });
  });
});
