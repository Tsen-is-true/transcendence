import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { GameGateway } from './game.gateway';
import { PongEngineService } from '../services/pong-engine.service';
import { GameResultService } from '../services/game-result.service';
import { UsersService } from '@modules/users/users.service';
import { LobbyGateway } from '@modules/rooms/gateways/lobby.gateway';
import { AchievementsService } from '@modules/achievements/achievements.service';
import { Match } from '../entities/match.entity';

describe('GameGateway', () => {
  let gateway: GameGateway;
  let jwtService: Record<string, jest.Mock>;
  let pongEngine: Record<string, jest.Mock>;
  let gameResultService: Record<string, jest.Mock>;
  let usersService: Record<string, jest.Mock>;
  let lobbyGateway: Record<string, jest.Mock>;
  let achievementsService: Record<string, jest.Mock>;
  let matchRepo: Partial<Record<string, jest.Mock>>;

  const createMockSocket = (id: string, token?: string) => ({
    id,
    handshake: {
      query: { token },
      auth: { token },
      headers: { authorization: token ? `Bearer ${token}` : undefined },
    },
    join: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
  });

  beforeEach(async () => {
    jest.useFakeTimers();
    jwtService = {
      verify: jest.fn(),
      sign: jest.fn(),
    };

    pongEngine = {
      setCallbacks: jest.fn(),
      createGame: jest.fn(),
      getGame: jest.fn(),
      findGameByUserId: jest.fn(),
      setPaddleDirection: jest.fn(),
      pauseGame: jest.fn(),
      resumeGame: jest.fn(),
      removeGame: jest.fn(),
      startGameLoop: jest.fn(),
      startBroadcastLoop: jest.fn(),
    };

    gameResultService = {
      setOnFinalReadyCallback: jest.fn(),
      setOnTournamentEventCallback: jest.fn(),
      setOnAchievementCheckCallback: jest.fn(),
      processGameEnd: jest.fn().mockResolvedValue(undefined),
    };

    usersService = {
      findById: jest.fn(),
      update: jest.fn(),
    };

    lobbyGateway = {
      emitGameStarting: jest.fn(),
      emitTournamentMatchEnd: jest.fn(),
      emitTournamentMatchStart: jest.fn(),
      emitTournamentUpdate: jest.fn(),
      emitTournamentEnd: jest.fn(),
    };

    achievementsService = {
      checkAchievements: jest.fn().mockResolvedValue([]),
    };

    matchRepo = {
      findOne: jest.fn(),
      update: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameGateway,
        { provide: JwtService, useValue: jwtService },
        { provide: PongEngineService, useValue: pongEngine },
        { provide: GameResultService, useValue: gameResultService },
        { provide: UsersService, useValue: usersService },
        { provide: LobbyGateway, useValue: lobbyGateway },
        { provide: AchievementsService, useValue: achievementsService },
        { provide: getRepositoryToken(Match), useValue: matchRepo },
      ],
    }).compile();

    gateway = module.get<GameGateway>(GameGateway);

    gateway.server = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('afterInit', () => {
    it('should set up callbacks on gameResultService and pongEngine', () => {
      gateway.afterInit();

      expect(gameResultService.setOnFinalReadyCallback).toHaveBeenCalledTimes(1);
      expect(gameResultService.setOnTournamentEventCallback).toHaveBeenCalledTimes(1);
      expect(gameResultService.setOnAchievementCheckCallback).toHaveBeenCalledTimes(1);
      expect(pongEngine.setCallbacks).toHaveBeenCalledTimes(1);
    });

    it('should pass callback functions to gameResultService', () => {
      gateway.afterInit();

      expect(typeof gameResultService.setOnFinalReadyCallback.mock.calls[0][0]).toBe('function');
      expect(typeof gameResultService.setOnTournamentEventCallback.mock.calls[0][0]).toBe('function');
      expect(typeof gameResultService.setOnAchievementCheckCallback.mock.calls[0][0]).toBe('function');
    });

    it('should pass an object with onScore and onGameEnd to pongEngine.setCallbacks', () => {
      gateway.afterInit();

      const callbacksArg = pongEngine.setCallbacks.mock.calls[0][0];
      expect(typeof callbacksArg.onScore).toBe('function');
      expect(typeof callbacksArg.onGameEnd).toBe('function');
    });
  });

  describe('handleConnection', () => {
    it('should map socket and user when token is valid', async () => {
      const client = createMockSocket('socket-1', 'valid-token');
      jwtService.verify.mockReturnValue({ sub: 42 });

      await gateway.handleConnection(client as any);

      expect(jwtService.verify).toHaveBeenCalledWith('valid-token');
      expect(client.disconnect).not.toHaveBeenCalled();
    });

    it('should disconnect client when no token is provided', async () => {
      const client = createMockSocket('socket-2');
      client.handshake.query = { token: undefined };
      client.handshake.auth = { token: undefined };
      client.handshake.headers = { authorization: undefined };

      await gateway.handleConnection(client as any);

      expect(client.disconnect).toHaveBeenCalled();
    });

    it('should disconnect client when token is invalid', async () => {
      const client = createMockSocket('socket-3', 'bad-token');
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid token');
      });

      await gateway.handleConnection(client as any);

      expect(client.disconnect).toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    it('should remove socket-user mappings', async () => {
      const client = createMockSocket('socket-1', 'valid-token');
      jwtService.verify.mockReturnValue({ sub: 42 });
      pongEngine.findGameByUserId.mockReturnValue(undefined);

      await gateway.handleConnection(client as any);
      gateway.handleDisconnect(client as any);

      // After disconnect, finding a game for the user should be checked
      expect(pongEngine.findGameByUserId).toHaveBeenCalledWith(42);
    });

    it('should pause game if player is in an active game', async () => {
      const client = createMockSocket('socket-1', 'valid-token');
      jwtService.verify.mockReturnValue({ sub: 42 });

      const mockGame = {
        matchId: 1,
        status: 'playing',
        players: {
          player1: { userId: 42, connected: true, socketId: 'socket-1' },
          player2: { userId: 99, connected: true, socketId: 'socket-2' },
        },
      };
      pongEngine.findGameByUserId.mockReturnValue(mockGame);

      await gateway.handleConnection(client as any);
      gateway.handleDisconnect(client as any);

      expect(pongEngine.pauseGame).toHaveBeenCalledWith(1);
    });
  });

  describe('handlePaddle', () => {
    it('should find game and set paddle direction', async () => {
      const client = createMockSocket('socket-1', 'valid-token');
      jwtService.verify.mockReturnValue({ sub: 42 });

      const mockGame = {
        matchId: 1,
        status: 'playing',
        players: {
          player1: { userId: 42 },
          player2: { userId: 99 },
        },
      };
      pongEngine.findGameByUserId.mockReturnValue(mockGame);

      await gateway.handleConnection(client as any);
      gateway.handlePaddle(client as any, { direction: 'up' });

      expect(pongEngine.findGameByUserId).toHaveBeenCalledWith(42);
      expect(pongEngine.setPaddleDirection).toHaveBeenCalledWith(1, 1, 'up');
    });

    it('should do nothing when user is not authenticated', () => {
      const client = createMockSocket('socket-unknown');

      gateway.handlePaddle(client as any, { direction: 'up' });

      expect(pongEngine.findGameByUserId).not.toHaveBeenCalled();
    });

    it('should do nothing when no game is found for user', async () => {
      const client = createMockSocket('socket-1', 'valid-token');
      jwtService.verify.mockReturnValue({ sub: 42 });
      pongEngine.findGameByUserId.mockReturnValue(undefined);

      await gateway.handleConnection(client as any);
      gateway.handlePaddle(client as any, { direction: 'down' });

      expect(pongEngine.setPaddleDirection).not.toHaveBeenCalled();
    });
  });

  describe('handlePing', () => {
    it('should emit game:pong with timestamp and serverTime', () => {
      const client = createMockSocket('socket-1');
      const now = Date.now();

      gateway.handlePing(client as any, { timestamp: now });

      expect(client.emit).toHaveBeenCalledWith('game:pong', {
        timestamp: now,
        serverTime: expect.any(Number),
      });
    });
  });
});
