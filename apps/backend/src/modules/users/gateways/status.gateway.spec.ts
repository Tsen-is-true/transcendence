import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { StatusGateway } from './status.gateway';
import { UsersService } from '../users.service';
import { FriendsService } from '@modules/friends/friends.service';

describe('StatusGateway', () => {
  let gateway: StatusGateway;
  let jwtService: jest.Mocked<JwtService>;
  let usersService: jest.Mocked<UsersService>;
  let friendsService: jest.Mocked<FriendsService>;

  const mockJwtService = {
    verify: jest.fn(),
  };

  const mockUsersService = {
    update: jest.fn(),
  };

  const mockFriendsService = {
    getFriendUserIds: jest.fn(),
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
    } as any;
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatusGateway,
        { provide: JwtService, useValue: mockJwtService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: FriendsService, useValue: mockFriendsService },
      ],
    }).compile();

    gateway = module.get<StatusGateway>(StatusGateway);
    jwtService = module.get(JwtService);
    usersService = module.get(UsersService);
    friendsService = module.get(FriendsService);

    (gateway as any).server = mockServer;

    jest.clearAllMocks();
    mockServer.to.mockReturnValue({ emit: mockEmit });
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    it('should authenticate, set maps, update online status, and broadcast when token is valid', async () => {
      const client = createMockClient('socket-1', { token: 'valid-token' });
      jwtService.verify.mockReturnValue({ sub: 42 } as any);
      usersService.update.mockResolvedValue(undefined as any);
      friendsService.getFriendUserIds.mockResolvedValue([10, 20]);

      // Pre-populate friend sockets so broadcast has targets
      (gateway as any).userSockets.set(10, new Set(['friend-socket-10']));
      (gateway as any).userSockets.set(20, new Set(['friend-socket-20']));

      await gateway.handleConnection(client);

      expect(jwtService.verify).toHaveBeenCalledWith('valid-token');
      expect(client.disconnect).not.toHaveBeenCalled();

      // Maps are populated
      expect((gateway as any).socketUser.get('socket-1')).toBe(42);
      expect((gateway as any).userSockets.get(42)?.has('socket-1')).toBe(true);

      // Online status updated
      expect(usersService.update).toHaveBeenCalledWith(42, { isOnline: true });

      // Broadcast to friends
      expect(friendsService.getFriendUserIds).toHaveBeenCalledWith(42);
      expect(mockServer.to).toHaveBeenCalledWith('friend-socket-10');
      expect(mockServer.to).toHaveBeenCalledWith('friend-socket-20');
      expect(mockEmit).toHaveBeenCalledWith('user:status', {
        userId: 42,
        isOnline: true,
        isPlaying: false,
      });
    });

    it('should disconnect client when no token is provided', async () => {
      const client = createMockClient('socket-1');

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalled();
      expect(jwtService.verify).not.toHaveBeenCalled();
      expect(usersService.update).not.toHaveBeenCalled();
    });

    it('should disconnect client when token verification throws', async () => {
      const client = createMockClient('socket-1', { token: 'bad-token' });
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid token');
      });

      await gateway.handleConnection(client);

      expect(client.disconnect).toHaveBeenCalled();
      expect(usersService.update).not.toHaveBeenCalled();
    });

    it('should clear existing disconnect timer on reconnect', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      const fakeTimer = setTimeout(() => {}, 100000) as NodeJS.Timeout;
      (gateway as any).disconnectTimers.set(42, fakeTimer);

      const client = createMockClient('socket-1', { token: 'valid-token' });
      jwtService.verify.mockReturnValue({ sub: 42 } as any);
      usersService.update.mockResolvedValue(undefined as any);
      friendsService.getFriendUserIds.mockResolvedValue([]);

      await gateway.handleConnection(client);

      expect(clearTimeoutSpy).toHaveBeenCalledWith(fakeTimer);
      expect((gateway as any).disconnectTimers.has(42)).toBe(false);

      clearTimeoutSpy.mockRestore();
      clearTimeout(fakeTimer);
    });
  });

  describe('handleDisconnect', () => {
    it('should remove socket from maps and set disconnect timer when last socket disconnects', () => {
      jest.useFakeTimers();

      const userId = 42;
      (gateway as any).socketUser.set('socket-1', userId);
      (gateway as any).userSockets.set(userId, new Set(['socket-1']));

      const client = createMockClient('socket-1');

      gateway.handleDisconnect(client);

      // socketUser cleaned up
      expect((gateway as any).socketUser.has('socket-1')).toBe(false);
      // userSockets removed since it was the last socket
      expect((gateway as any).userSockets.has(userId)).toBe(false);
      // disconnect timer is set
      expect((gateway as any).disconnectTimers.has(userId)).toBe(true);

      jest.useRealTimers();
    });

    it('should not set timer if user still has other sockets connected', () => {
      const userId = 42;
      (gateway as any).socketUser.set('socket-1', userId);
      (gateway as any).socketUser.set('socket-2', userId);
      (gateway as any).userSockets.set(userId, new Set(['socket-1', 'socket-2']));

      const client = createMockClient('socket-1');

      gateway.handleDisconnect(client);

      expect((gateway as any).socketUser.has('socket-1')).toBe(false);
      expect((gateway as any).userSockets.get(userId)?.has('socket-2')).toBe(true);
      expect((gateway as any).disconnectTimers.has(userId)).toBe(false);
    });

    it('should do nothing if socket is not associated with a user', async () => {
      const client = createMockClient('unknown-socket');

      await gateway.handleDisconnect(client);

      expect(usersService.update).not.toHaveBeenCalled();
    });
  });
});
