import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ChatGateway } from './chat.gateway';
import { ChatService } from '../chat.service';
import { FriendsService } from '@modules/friends/friends.service';

describe('ChatGateway', () => {
  let gateway: ChatGateway;

  const mockJwtService: Record<string, jest.Mock> = {
    verify: jest.fn(),
  };

  const mockChatService: Record<string, jest.Mock> = {
    saveMessage: jest.fn(),
    markAsRead: jest.fn(),
  };

  const mockFriendsService: Record<string, jest.Mock> = {
    isBlocked: jest.fn(),
  };

  const mockEmit = jest.fn();
  const mockServer = {
    to: jest.fn().mockReturnValue({ emit: mockEmit }),
  };

  function createMockClient(
    id: string,
    overrides: Partial<{
      token: string;
      authToken: string;
      authorization: string;
    }> = {},
  ) {
    return {
      id,
      handshake: {
        query: { token: overrides.token ?? undefined },
        auth: { token: overrides.authToken ?? undefined },
        headers: {
          authorization: overrides.authorization ?? undefined,
        },
      },
      disconnect: jest.fn(),
      emit: jest.fn(),
    } as any;
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatGateway,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ChatService, useValue: mockChatService },
        { provide: FriendsService, useValue: mockFriendsService },
      ],
    }).compile();

    gateway = module.get<ChatGateway>(ChatGateway);
    (gateway as any).server = mockServer;

    jest.clearAllMocks();
    mockServer.to.mockReturnValue({ emit: mockEmit });
  });

  // ─── handleConnection ─────────────────────────────────────────

  describe('handleConnection', () => {
    it('should authenticate and set maps when token is valid', async () => {
      const client = createMockClient('socket-1', { token: 'valid-token' });
      mockJwtService.verify.mockReturnValue({ sub: 42 });

      await gateway.handleConnection(client);

      expect(mockJwtService.verify).toHaveBeenCalledWith('valid-token');
      expect(client.disconnect).not.toHaveBeenCalled();
      expect((gateway as any).socketUser.get('socket-1')).toBe(42);
      expect((gateway as any).userSockets.get(42)?.has('socket-1')).toBe(true);
    });

    it('should disconnect client when no token is provided', async () => {
      const client = createMockClient('socket-1');

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalled();
      expect(mockJwtService.verify).not.toHaveBeenCalled();
    });

    it('should disconnect client when token verification fails', async () => {
      const client = createMockClient('socket-1', { token: 'bad-token' });
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('invalid token');
      });

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalled();
      expect((gateway as any).socketUser.has('socket-1')).toBe(false);
    });

    it('should support token from auth object', async () => {
      const client = createMockClient('socket-1', { authToken: 'auth-token' });
      mockJwtService.verify.mockReturnValue({ sub: 10 });

      await gateway.handleConnection(client);

      expect(mockJwtService.verify).toHaveBeenCalledWith('auth-token');
      expect((gateway as any).socketUser.get('socket-1')).toBe(10);
    });

    it('should support token from authorization header', async () => {
      const client = createMockClient('socket-1', {
        authorization: 'Bearer header-token',
      });
      mockJwtService.verify.mockReturnValue({ sub: 20 });

      await gateway.handleConnection(client);

      expect(mockJwtService.verify).toHaveBeenCalledWith('header-token');
      expect((gateway as any).socketUser.get('socket-1')).toBe(20);
    });
  });

  // ─── handleDisconnect ─────────────────────────────────────────

  describe('handleDisconnect', () => {
    it('should clean up maps when last socket disconnects', () => {
      const userId = 42;
      (gateway as any).socketUser.set('socket-1', userId);
      (gateway as any).userSockets.set(userId, new Set(['socket-1']));

      const client = createMockClient('socket-1');

      gateway.handleDisconnect(client);

      expect((gateway as any).socketUser.has('socket-1')).toBe(false);
      expect((gateway as any).userSockets.has(userId)).toBe(false);
    });

    it('should keep userSockets entry if user has other sockets', () => {
      const userId = 42;
      (gateway as any).socketUser.set('socket-1', userId);
      (gateway as any).socketUser.set('socket-2', userId);
      (gateway as any).userSockets.set(userId, new Set(['socket-1', 'socket-2']));

      const client = createMockClient('socket-1');

      gateway.handleDisconnect(client);

      expect((gateway as any).socketUser.has('socket-1')).toBe(false);
      expect((gateway as any).userSockets.get(userId)?.has('socket-2')).toBe(true);
    });

    it('should do nothing if socket is not associated with a user', () => {
      const client = createMockClient('unknown-socket');

      gateway.handleDisconnect(client);

      // Should not throw
      expect((gateway as any).socketUser.has('unknown-socket')).toBe(false);
    });
  });

  // ─── handleSend ───────────────────────────────────────────────

  describe('handleSend', () => {
    it('should save message and emit to receiver and sender sockets', async () => {
      const senderId = 1;
      const receiverId = 2;
      (gateway as any).socketUser.set('socket-1', senderId);
      (gateway as any).userSockets.set(senderId, new Set(['socket-1']));
      (gateway as any).userSockets.set(receiverId, new Set(['socket-2']));

      mockFriendsService.isBlocked.mockResolvedValue(false);

      const savedMessage = {
        messageId: 10,
        senderId,
        receiverId,
        content: 'hello',
        isRead: false,
        createdAt: new Date(),
      };
      mockChatService.saveMessage.mockResolvedValue(savedMessage);

      const client = createMockClient('socket-1');
      await gateway.handleSend(client, { receiverId, content: 'hello' });

      expect(mockFriendsService.isBlocked).toHaveBeenCalledWith(senderId, receiverId);
      expect(mockChatService.saveMessage).toHaveBeenCalledWith(senderId, receiverId, 'hello');
      expect(mockServer.to).toHaveBeenCalledWith('socket-2');
      expect(mockServer.to).toHaveBeenCalledWith('socket-1');
      expect(mockEmit).toHaveBeenCalledWith('chat:message', {
        messageId: 10,
        senderId,
        receiverId,
        content: 'hello',
        isRead: false,
        createdAt: savedMessage.createdAt,
      });
    });

    it('should emit error when user is blocked', async () => {
      (gateway as any).socketUser.set('socket-1', 1);
      mockFriendsService.isBlocked.mockResolvedValue(true);

      const client = createMockClient('socket-1');
      await gateway.handleSend(client, { receiverId: 2, content: 'hi' });

      expect(client.emit).toHaveBeenCalledWith('chat:error', {
        message: '차단된 유저입니다',
      });
      expect(mockChatService.saveMessage).not.toHaveBeenCalled();
    });

    it('should emit error when content is empty', async () => {
      (gateway as any).socketUser.set('socket-1', 1);
      mockFriendsService.isBlocked.mockResolvedValue(false);

      const client = createMockClient('socket-1');
      await gateway.handleSend(client, { receiverId: 2, content: '' });

      expect(client.emit).toHaveBeenCalledWith('chat:error', {
        message: '메시지는 1~500자여야 합니다',
      });
      expect(mockChatService.saveMessage).not.toHaveBeenCalled();
    });

    it('should emit error when content exceeds 500 characters', async () => {
      (gateway as any).socketUser.set('socket-1', 1);
      mockFriendsService.isBlocked.mockResolvedValue(false);

      const client = createMockClient('socket-1');
      const longContent = 'a'.repeat(501);
      await gateway.handleSend(client, { receiverId: 2, content: longContent });

      expect(client.emit).toHaveBeenCalledWith('chat:error', {
        message: '메시지는 1~500자여야 합니다',
      });
      expect(mockChatService.saveMessage).not.toHaveBeenCalled();
    });

    it('should emit error when spam limit is exceeded', async () => {
      (gateway as any).socketUser.set('socket-1', 1);
      mockFriendsService.isBlocked.mockResolvedValue(false);

      // Pre-populate spam tracker with 3 recent timestamps
      const now = Date.now();
      (gateway as any).spamTracker.set('1:2', [now, now, now]);

      const client = createMockClient('socket-1');
      await gateway.handleSend(client, { receiverId: 2, content: 'spam' });

      expect(client.emit).toHaveBeenCalledWith('chat:error', {
        message: '메시지를 너무 빠르게 보내고 있습니다',
      });
      expect(mockChatService.saveMessage).not.toHaveBeenCalled();
    });

    it('should do nothing when sender is not authenticated', async () => {
      const client = createMockClient('socket-1');
      await gateway.handleSend(client, { receiverId: 2, content: 'hi' });

      expect(mockFriendsService.isBlocked).not.toHaveBeenCalled();
      expect(mockChatService.saveMessage).not.toHaveBeenCalled();
    });

    it('should escape HTML in content before saving', async () => {
      (gateway as any).socketUser.set('socket-1', 1);
      (gateway as any).userSockets.set(1, new Set(['socket-1']));
      mockFriendsService.isBlocked.mockResolvedValue(false);
      mockChatService.saveMessage.mockResolvedValue({
        messageId: 1,
        senderId: 1,
        receiverId: 2,
        content: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
        isRead: false,
        createdAt: new Date(),
      });

      const client = createMockClient('socket-1');
      await gateway.handleSend(client, {
        receiverId: 2,
        content: '<script>alert("xss")</script>',
      });

      expect(mockChatService.saveMessage).toHaveBeenCalledWith(
        1,
        2,
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
      );
    });
  });

  // ─── handleRead ───────────────────────────────────────────────

  describe('handleRead', () => {
    it('should mark as read and emit to sender', async () => {
      const userId = 1;
      const senderId = 2;
      (gateway as any).socketUser.set('socket-1', userId);
      (gateway as any).userSockets.set(senderId, new Set(['socket-2']));

      mockChatService.markAsRead.mockResolvedValue({ updatedCount: 3 });

      const client = createMockClient('socket-1');
      await gateway.handleRead(client, { senderId });

      expect(mockChatService.markAsRead).toHaveBeenCalledWith(userId, senderId);
      expect(mockServer.to).toHaveBeenCalledWith('socket-2');
      expect(mockEmit).toHaveBeenCalledWith(
        'chat:read',
        expect.objectContaining({
          senderId: userId,
          readAt: expect.any(Date),
        }),
      );
    });

    it('should do nothing when user is not authenticated', async () => {
      const client = createMockClient('socket-1');
      await gateway.handleRead(client, { senderId: 2 });

      expect(mockChatService.markAsRead).not.toHaveBeenCalled();
    });
  });

  // ─── handleTyping ─────────────────────────────────────────────

  describe('handleTyping', () => {
    it('should relay typing status to receiver', () => {
      const userId = 1;
      const receiverId = 2;
      (gateway as any).socketUser.set('socket-1', userId);
      (gateway as any).userSockets.set(receiverId, new Set(['socket-2']));

      const client = createMockClient('socket-1');
      gateway.handleTyping(client, { receiverId, isTyping: true });

      expect(mockServer.to).toHaveBeenCalledWith('socket-2');
      expect(mockEmit).toHaveBeenCalledWith('chat:typing', {
        userId,
        isTyping: true,
      });
    });

    it('should relay typing stopped to receiver', () => {
      const userId = 1;
      const receiverId = 2;
      (gateway as any).socketUser.set('socket-1', userId);
      (gateway as any).userSockets.set(receiverId, new Set(['socket-2']));

      const client = createMockClient('socket-1');
      gateway.handleTyping(client, { receiverId, isTyping: false });

      expect(mockEmit).toHaveBeenCalledWith('chat:typing', {
        userId,
        isTyping: false,
      });
    });

    it('should do nothing when user is not authenticated', () => {
      const client = createMockClient('socket-1');
      gateway.handleTyping(client, { receiverId: 2, isTyping: true });

      expect(mockServer.to).not.toHaveBeenCalled();
    });
  });
});
