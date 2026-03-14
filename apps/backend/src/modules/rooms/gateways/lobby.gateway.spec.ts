import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { LobbyGateway } from './lobby.gateway';
import { RoomsService } from '../rooms.service';

describe('LobbyGateway', () => {
  let gateway: LobbyGateway;

  const jwtService: Record<string, jest.Mock> = {
    verify: jest.fn(),
  };

  const roomsService: Record<string, jest.Mock> = {
    toggleReady: jest.fn(),
    kickMember: jest.fn(),
  };

  const mockEmit = jest.fn();
  const mockToEmit = jest.fn();
  const mockTo = jest.fn().mockReturnValue({ emit: mockToEmit });
  const mockServer = { emit: mockEmit, to: mockTo };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LobbyGateway,
        { provide: JwtService, useValue: jwtService },
        { provide: RoomsService, useValue: roomsService },
      ],
    }).compile();

    gateway = module.get<LobbyGateway>(LobbyGateway);
    (gateway as any).server = mockServer;
    jest.clearAllMocks();
    // Re-assign after clearAllMocks since mockTo's return value is cleared
    mockTo.mockReturnValue({ emit: mockToEmit });
  });

  // ─── handleConnection ─────────────────────────────────────────

  describe('handleConnection', () => {
    it('should authenticate and store userId for valid token', async () => {
      const client = {
        id: 'socket-1',
        handshake: {
          query: { token: 'valid-token' },
          auth: {},
          headers: {},
        },
        disconnect: jest.fn(),
      };
      jwtService.verify.mockReturnValue({ sub: 42 });

      await gateway.handleConnection(client as any);

      expect(jwtService.verify).toHaveBeenCalledWith('valid-token');
      expect(gateway.getUserIdFromSocket(client as any)).toBe(42);
      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it('should disconnect client when token is invalid', async () => {
      const client = {
        id: 'socket-2',
        handshake: {
          query: { token: 'bad-token' },
          auth: {},
          headers: {},
        },
        disconnect: jest.fn(),
      };
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid token');
      });

      await gateway.handleConnection(client as any);

      expect(client.disconnect).toHaveBeenCalled();
    });

    it('should disconnect client when no token is provided', async () => {
      const client = {
        id: 'socket-3',
        handshake: {
          query: {},
          auth: {},
          headers: {},
        },
        disconnect: jest.fn(),
      };

      await gateway.handleConnection(client as any);

      expect(client.disconnect).toHaveBeenCalled();
      expect(jwtService.verify).not.toHaveBeenCalled();
    });
  });

  // ─── handleDisconnect ─────────────────────────────────────────

  describe('handleDisconnect', () => {
    it('should remove user from socketUser map', async () => {
      const client = {
        id: 'socket-1',
        handshake: { query: { token: 'tok' }, auth: {}, headers: {} },
        disconnect: jest.fn(),
      };
      jwtService.verify.mockReturnValue({ sub: 42 });
      await gateway.handleConnection(client as any);

      gateway.handleDisconnect(client as any);

      expect(gateway.getUserIdFromSocket(client as any)).toBeUndefined();
    });
  });

  // ─── handleRoomJoin ───────────────────────────────────────────

  describe('handleRoomJoin', () => {
    it('should call client.join with the room key', () => {
      const client = { join: jest.fn() } as any;

      gateway.handleRoomJoin(client, { roomId: 5 });

      expect(client.join).toHaveBeenCalledWith('room:5');
    });
  });

  // ─── handleRoomLeave ──────────────────────────────────────────

  describe('handleRoomLeave', () => {
    it('should call client.leave with the room key', () => {
      const client = { leave: jest.fn() } as any;

      gateway.handleRoomLeave(client, { roomId: 5 });

      expect(client.leave).toHaveBeenCalledWith('room:5');
    });
  });

  // ─── handleReady ──────────────────────────────────────────────

  describe('handleReady', () => {
    it('should call roomsService.toggleReady with correct args', async () => {
      const client = {
        id: 'socket-1',
        handshake: { query: { token: 'tok' }, auth: {}, headers: {} },
        disconnect: jest.fn(),
      };
      jwtService.verify.mockReturnValue({ sub: 42 });
      await gateway.handleConnection(client as any);

      roomsService.toggleReady.mockResolvedValue(undefined);

      await gateway.handleReady(client as any, { roomId: 1, isReady: true });

      expect(roomsService.toggleReady).toHaveBeenCalledWith(1, 42, true);
    });

    it('should return early if userId is not found', async () => {
      const client = { id: 'unknown-socket' } as any;

      await gateway.handleReady(client, { roomId: 1, isReady: true });

      expect(roomsService.toggleReady).not.toHaveBeenCalled();
    });
  });

  // ─── handleKick ───────────────────────────────────────────────

  describe('handleKick', () => {
    it('should call roomsService.kickMember with correct args', async () => {
      const client = {
        id: 'socket-1',
        handshake: { query: { token: 'tok' }, auth: {}, headers: {} },
        disconnect: jest.fn(),
      };
      jwtService.verify.mockReturnValue({ sub: 10 });
      await gateway.handleConnection(client as any);

      roomsService.kickMember.mockResolvedValue(undefined);

      await gateway.handleKick(client as any, { roomId: 1, userId: 20 });

      expect(roomsService.kickMember).toHaveBeenCalledWith(1, 10, 20);
    });

    it('should return early if hostUserId is not found', async () => {
      const client = { id: 'unknown-socket' } as any;

      await gateway.handleKick(client, { roomId: 1, userId: 20 });

      expect(roomsService.kickMember).not.toHaveBeenCalled();
    });
  });

  // ─── emit methods ─────────────────────────────────────────────

  describe('emitRoomCreated', () => {
    it('should emit room:created to server', () => {
      const room = { roomId: 1, title: 'Room' };

      gateway.emitRoomCreated(room);

      expect(mockEmit).toHaveBeenCalledWith('room:created', room);
    });
  });

  describe('emitRoomUpdated', () => {
    it('should emit room:updated to server', () => {
      const room = { roomId: 1, title: 'Room' };

      gateway.emitRoomUpdated(room);

      expect(mockEmit).toHaveBeenCalledWith('room:updated', room);
    });
  });

  describe('emitRoomDeleted', () => {
    it('should emit room:deleted to server', () => {
      gateway.emitRoomDeleted(5);

      expect(mockEmit).toHaveBeenCalledWith('room:deleted', { roomId: 5 });
    });
  });

  describe('emitMemberJoined', () => {
    it('should emit room:member:joined to the room', () => {
      const user = { userid: 10, nickname: 'Player' };

      gateway.emitMemberJoined(1, user);

      expect(mockTo).toHaveBeenCalledWith('room:1');
      expect(mockToEmit).toHaveBeenCalledWith('room:member:joined', { roomId: 1, user });
    });
  });

  describe('emitMemberLeft', () => {
    it('should emit room:member:left to the room', () => {
      gateway.emitMemberLeft(1, 10);

      expect(mockTo).toHaveBeenCalledWith('room:1');
      expect(mockToEmit).toHaveBeenCalledWith('room:member:left', { roomId: 1, userId: 10 });
    });
  });

  describe('emitMemberReady', () => {
    it('should emit room:member:ready to the room', () => {
      gateway.emitMemberReady(1, 10, true);

      expect(mockTo).toHaveBeenCalledWith('room:1');
      expect(mockToEmit).toHaveBeenCalledWith('room:member:ready', { roomId: 1, userId: 10, isReady: true });
    });
  });

  describe('emitGameStarting', () => {
    it('should emit room:game:starting to the room', () => {
      gateway.emitGameStarting(1, 100);

      expect(mockTo).toHaveBeenCalledWith('room:1');
      expect(mockToEmit).toHaveBeenCalledWith('room:game:starting', { roomId: 1, matchId: 100 });
    });
  });
});
