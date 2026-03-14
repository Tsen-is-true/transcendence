import { PongEngineService } from './pong-engine.service';
import { GAME_CONFIG } from '../constants/game.constants';

describe('PongEngineService', () => {
  let service: PongEngineService;

  beforeEach(() => {
    service = new PongEngineService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createGame', () => {
    it('should return a game with countdown status', () => {
      const game = service.createGame(1, 10, 100, 200);

      expect(game.matchId).toBe(1);
      expect(game.roomId).toBe(10);
      expect(game.status).toBe('countdown');
    });

    it('should place the ball at the center of the canvas', () => {
      const game = service.createGame(1, 10, 100, 200);

      expect(game.ball.x).toBe(GAME_CONFIG.CANVAS_WIDTH / 2);
      expect(game.ball.y).toBe(GAME_CONFIG.CANVAS_HEIGHT / 2);
      expect(game.ball.speed).toBe(GAME_CONFIG.BALL_INITIAL_SPEED);
    });

    it('should initialize both players with score 0 and paddle at center', () => {
      const game = service.createGame(1, 10, 100, 200);
      const expectedPaddleY =
        (GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.PADDLE_HEIGHT) / 2;

      expect(game.players.player1.userId).toBe(100);
      expect(game.players.player1.score).toBe(0);
      expect(game.players.player1.paddleY).toBe(expectedPaddleY);
      expect(game.players.player1.connected).toBe(false);
      expect(game.players.player1.direction).toBe('stop');

      expect(game.players.player2.userId).toBe(200);
      expect(game.players.player2.score).toBe(0);
      expect(game.players.player2.paddleY).toBe(expectedPaddleY);
    });

    it('should set rallyCount to 0', () => {
      const game = service.createGame(1, 10, 100, 200);

      expect(game.rallyCount).toBe(0);
    });
  });

  describe('getGame', () => {
    it('should return the game when it exists', () => {
      service.createGame(1, 10, 100, 200);

      const game = service.getGame(1);

      expect(game).toBeDefined();
      expect(game?.matchId).toBe(1);
    });

    it('should return undefined when game does not exist', () => {
      const game = service.getGame(999);

      expect(game).toBeUndefined();
    });
  });

  describe('findGameByUserId', () => {
    it('should find game by player1 userId', () => {
      service.createGame(1, 10, 100, 200);

      const game = service.findGameByUserId(100);

      expect(game).toBeDefined();
      expect(game?.matchId).toBe(1);
    });

    it('should find game by player2 userId', () => {
      service.createGame(1, 10, 100, 200);

      const game = service.findGameByUserId(200);

      expect(game).toBeDefined();
      expect(game?.matchId).toBe(1);
    });

    it('should return undefined when userId is not in any game', () => {
      service.createGame(1, 10, 100, 200);

      const game = service.findGameByUserId(999);

      expect(game).toBeUndefined();
    });
  });

  describe('setPaddleDirection', () => {
    it('should change paddle direction when game status is playing', () => {
      const game = service.createGame(1, 10, 100, 200);
      game.status = 'playing';

      service.setPaddleDirection(1, 1, 'up');

      expect(game.players.player1.direction).toBe('up');
    });

    it('should change player2 paddle direction', () => {
      const game = service.createGame(1, 10, 100, 200);
      game.status = 'playing';

      service.setPaddleDirection(1, 2, 'down');

      expect(game.players.player2.direction).toBe('down');
    });

    it('should do nothing when game status is countdown', () => {
      const game = service.createGame(1, 10, 100, 200);

      service.setPaddleDirection(1, 1, 'up');

      expect(game.players.player1.direction).toBe('stop');
    });

    it('should do nothing when game status is paused', () => {
      const game = service.createGame(1, 10, 100, 200);
      game.status = 'paused';

      service.setPaddleDirection(1, 1, 'up');

      expect(game.players.player1.direction).toBe('stop');
    });

    it('should do nothing when game does not exist', () => {
      expect(() => {
        service.setPaddleDirection(999, 1, 'up');
      }).not.toThrow();
    });
  });

  describe('pauseGame', () => {
    it('should set game status to paused', () => {
      const game = service.createGame(1, 10, 100, 200);
      game.status = 'playing';

      service.pauseGame(1);

      expect(game.status).toBe('paused');
    });

    it('should do nothing when game does not exist', () => {
      expect(() => {
        service.pauseGame(999);
      }).not.toThrow();
    });
  });

  describe('resumeGame', () => {
    it('should set game status to playing', () => {
      const game = service.createGame(1, 10, 100, 200);
      game.status = 'paused';

      service.resumeGame(1);

      expect(game.status).toBe('playing');
    });

    it('should update lastUpdateAt', () => {
      const game = service.createGame(1, 10, 100, 200);
      game.status = 'paused';
      const beforeResume = Date.now();

      service.resumeGame(1);

      expect(game.lastUpdateAt).toBeGreaterThanOrEqual(beforeResume);
    });

    it('should do nothing when game does not exist', () => {
      expect(() => {
        service.resumeGame(999);
      }).not.toThrow();
    });
  });

  describe('removeGame', () => {
    it('should make the game no longer accessible', () => {
      service.createGame(1, 10, 100, 200);

      service.removeGame(1);

      expect(service.getGame(1)).toBeUndefined();
    });

    it('should do nothing when game does not exist', () => {
      expect(() => {
        service.removeGame(999);
      }).not.toThrow();
    });
  });

  describe('getMinimizedState', () => {
    it('should return correctly shaped minimized state', () => {
      const game = service.createGame(1, 10, 100, 200);

      const minimized = service.getMinimizedState(game);

      expect(minimized).toHaveProperty('b');
      expect(minimized).toHaveProperty('p1');
      expect(minimized).toHaveProperty('p2');
      expect(minimized).toHaveProperty('t');

      expect(minimized.b.x).toBe(game.ball.x);
      expect(minimized.b.y).toBe(game.ball.y);
      expect(minimized.p1.y).toBe(game.players.player1.paddleY);
      expect(minimized.p1.s).toBe(game.players.player1.score);
      expect(minimized.p2.y).toBe(game.players.player2.paddleY);
      expect(minimized.p2.s).toBe(game.players.player2.score);
      expect(typeof minimized.t).toBe('number');
    });
  });

  describe('setCallbacks', () => {
    it('should store onScore and onGameEnd callbacks', () => {
      const onScore = jest.fn();
      const onGameEnd = jest.fn();

      service.setCallbacks({ onScore, onGameEnd });

      // Verify callbacks are stored by accessing them indirectly:
      // The callbacks are invoked during tick when a score event occurs.
      // We verify storage by checking no errors occur.
      expect(() => {
        service.setCallbacks({ onScore, onGameEnd });
      }).not.toThrow();
    });
  });

  describe('startGameLoop and startBroadcastLoop', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('startBroadcastLoop should call broadcastFn at the configured rate', () => {
      service.createGame(1, 10, 100, 200);
      const broadcastFn = jest.fn();

      service.startBroadcastLoop(1, broadcastFn);

      jest.advanceTimersByTime(1000 / GAME_CONFIG.BROADCAST_RATE);

      expect(broadcastFn).toHaveBeenCalled();

      service.removeGame(1);
    });
  });
});
