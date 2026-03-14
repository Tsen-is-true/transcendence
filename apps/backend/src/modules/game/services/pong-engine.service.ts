import { Injectable } from '@nestjs/common';
import { GAME_CONFIG } from '../constants/game.constants';
import {
  GameState,
  PlayerState,
  BallState,
  MinimizedGameState,
  ScoreEvent,
  PaddleDirection,
} from '../interfaces/game-state.interface';

@Injectable()
export class PongEngineService {
  private games = new Map<number, GameState>();
  private gameLoops = new Map<number, NodeJS.Timeout>();
  private broadcastLoops = new Map<number, NodeJS.Timeout>();

  private onScoreCallback?: (matchId: number, event: ScoreEvent) => void;
  private onGameEndCallback?: (matchId: number, winnerId: number) => void;

  setCallbacks(callbacks: {
    onScore: (matchId: number, event: ScoreEvent) => void;
    onGameEnd: (matchId: number, winnerId: number) => void;
  }) {
    this.onScoreCallback = callbacks.onScore;
    this.onGameEndCallback = callbacks.onGameEnd;
  }

  createGame(
    matchId: number,
    roomId: number,
    player1Id: number,
    player2Id: number,
  ): GameState {
    const game: GameState = {
      matchId,
      roomId,
      status: 'countdown',
      ball: this.createInitialBall(),
      players: {
        player1: this.createPlayer(player1Id),
        player2: this.createPlayer(player2Id),
      },
      rallyCount: 0,
      lastUpdateAt: Date.now(),
    };

    this.games.set(matchId, game);
    return game;
  }

  startGameLoop(matchId: number): void {
    const interval = setInterval(() => {
      this.tick(matchId);
    }, 1000 / GAME_CONFIG.TICK_RATE);

    this.gameLoops.set(matchId, interval);
  }

  startBroadcastLoop(
    matchId: number,
    broadcastFn: (matchId: number, state: MinimizedGameState) => void,
  ): void {
    const interval = setInterval(() => {
      const game = this.games.get(matchId);
      if (!game) return;
      broadcastFn(matchId, this.getMinimizedState(game));
    }, 1000 / GAME_CONFIG.BROADCAST_RATE);

    this.broadcastLoops.set(matchId, interval);
  }

  getGame(matchId: number): GameState | undefined {
    return this.games.get(matchId);
  }

  findGameByUserId(userId: number): GameState | undefined {
    for (const game of this.games.values()) {
      if (
        game.players.player1.userId === userId ||
        game.players.player2.userId === userId
      ) {
        return game;
      }
    }
    return undefined;
  }

  setPaddleDirection(
    matchId: number,
    playerNum: 1 | 2,
    direction: PaddleDirection,
  ): void {
    const game = this.games.get(matchId);
    if (!game || game.status !== 'playing') return;

    const player =
      playerNum === 1 ? game.players.player1 : game.players.player2;
    player.direction = direction;
  }

  pauseGame(matchId: number): void {
    const game = this.games.get(matchId);
    if (!game) return;

    game.status = 'paused';
    this.clearGameLoop(matchId);
    this.clearBroadcastLoop(matchId);
  }

  resumeGame(matchId: number): void {
    const game = this.games.get(matchId);
    if (!game) return;

    game.status = 'playing';
    game.lastUpdateAt = Date.now();
  }

  removeGame(matchId: number): void {
    this.clearGameLoop(matchId);
    this.clearBroadcastLoop(matchId);
    this.games.delete(matchId);
  }

  getMinimizedState(game: GameState): MinimizedGameState {
    return {
      b: { x: game.ball.x, y: game.ball.y },
      p1: { y: game.players.player1.paddleY, s: game.players.player1.score },
      p2: { y: game.players.player2.paddleY, s: game.players.player2.score },
      t: Date.now(),
    };
  }

  private tick(matchId: number): void {
    const game = this.games.get(matchId);
    if (!game || game.status !== 'playing') return;

    const now = Date.now();
    const delta = now - game.lastUpdateAt;

    this.updatePaddles(game);
    this.updateBall(game, delta);
    this.checkWallCollision(game);
    this.checkPaddleCollision(game);

    const scoreEvent = this.checkScore(game);
    if (scoreEvent) {
      if (this.onScoreCallback) {
        this.onScoreCallback(matchId, scoreEvent);
      }
      if (scoreEvent.isGameOver && scoreEvent.winnerId) {
        game.status = 'finished';
        this.clearGameLoop(matchId);
        this.clearBroadcastLoop(matchId);
        if (this.onGameEndCallback) {
          this.onGameEndCallback(matchId, scoreEvent.winnerId);
        }
      }
    }

    game.lastUpdateAt = now;
  }

  private updatePaddles(game: GameState): void {
    for (const player of [game.players.player1, game.players.player2]) {
      if (player.direction === 'up') {
        player.paddleY = Math.max(0, player.paddleY - GAME_CONFIG.PADDLE_SPEED);
      } else if (player.direction === 'down') {
        player.paddleY = Math.min(
          GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.PADDLE_HEIGHT,
          player.paddleY + GAME_CONFIG.PADDLE_SPEED,
        );
      }
    }
  }

  private updateBall(game: GameState, delta: number): void {
    const factor = delta / (1000 / GAME_CONFIG.TICK_RATE);
    game.ball.x += game.ball.velocityX * factor;
    game.ball.y += game.ball.velocityY * factor;
  }

  private checkWallCollision(game: GameState): void {
    const halfBall = GAME_CONFIG.BALL_SIZE / 2;

    if (game.ball.y - halfBall <= 0) {
      game.ball.y = halfBall;
      game.ball.velocityY = Math.abs(game.ball.velocityY);
    } else if (game.ball.y + halfBall >= GAME_CONFIG.CANVAS_HEIGHT) {
      game.ball.y = GAME_CONFIG.CANVAS_HEIGHT - halfBall;
      game.ball.velocityY = -Math.abs(game.ball.velocityY);
    }
  }

  private checkPaddleCollision(game: GameState): void {
    const halfBall = GAME_CONFIG.BALL_SIZE / 2;
    const { ball } = game;

    // Player 1 paddle (left side)
    const p1x = GAME_CONFIG.PADDLE_MARGIN;
    const p1 = game.players.player1;
    if (
      ball.velocityX < 0 &&
      ball.x - halfBall <= p1x + GAME_CONFIG.PADDLE_WIDTH &&
      ball.x - halfBall >= p1x &&
      ball.y >= p1.paddleY &&
      ball.y <= p1.paddleY + GAME_CONFIG.PADDLE_HEIGHT
    ) {
      this.applyPaddleBounce(game, p1, 1);
    }

    // Player 2 paddle (right side)
    const p2x =
      GAME_CONFIG.CANVAS_WIDTH -
      GAME_CONFIG.PADDLE_MARGIN -
      GAME_CONFIG.PADDLE_WIDTH;
    const p2 = game.players.player2;
    if (
      ball.velocityX > 0 &&
      ball.x + halfBall >= p2x &&
      ball.x + halfBall <= p2x + GAME_CONFIG.PADDLE_WIDTH &&
      ball.y >= p2.paddleY &&
      ball.y <= p2.paddleY + GAME_CONFIG.PADDLE_HEIGHT
    ) {
      this.applyPaddleBounce(game, p2, -1);
    }
  }

  private applyPaddleBounce(
    game: GameState,
    player: PlayerState,
    directionX: number,
  ): void {
    const paddleCenterY = player.paddleY + GAME_CONFIG.PADDLE_HEIGHT / 2;
    const relativeIntersectY =
      (paddleCenterY - game.ball.y) / (GAME_CONFIG.PADDLE_HEIGHT / 2);
    const clampedIntersect = Math.max(-1, Math.min(1, relativeIntersectY));
    const bounceAngle = clampedIntersect * ((Math.PI * 5) / 12); // max 75°

    game.ball.speed = Math.min(
      game.ball.speed + GAME_CONFIG.BALL_SPEED_INCREMENT,
      GAME_CONFIG.BALL_MAX_SPEED,
    );

    game.ball.velocityX =
      game.ball.speed * Math.cos(bounceAngle) * directionX;
    game.ball.velocityY = game.ball.speed * -Math.sin(bounceAngle);
    game.rallyCount++;
  }

  private checkScore(game: GameState): ScoreEvent | null {
    const { ball } = game;

    if (ball.x < 0) {
      // Player 2 scores
      game.players.player2.score++;
      return this.processScore(game, game.players.player2.userId);
    }

    if (ball.x > GAME_CONFIG.CANVAS_WIDTH) {
      // Player 1 scores
      game.players.player1.score++;
      return this.processScore(game, game.players.player1.userId);
    }

    return null;
  }

  private processScore(game: GameState, scorerId: number): ScoreEvent {
    const isGameOver =
      game.players.player1.score >= GAME_CONFIG.WINNING_SCORE ||
      game.players.player2.score >= GAME_CONFIG.WINNING_SCORE;

    const winnerId = isGameOver ? scorerId : undefined;

    // Reset ball
    game.ball = this.createInitialBall();
    game.rallyCount = 0;

    return {
      player1Score: game.players.player1.score,
      player2Score: game.players.player2.score,
      scorerId,
      isGameOver,
      winnerId,
    };
  }

  private createInitialBall(): BallState {
    const directionX = Math.random() > 0.5 ? 1 : -1;
    const angle = ((Math.random() * 60 - 30) * Math.PI) / 180; // -30° ~ 30°

    return {
      x: GAME_CONFIG.CANVAS_WIDTH / 2,
      y: GAME_CONFIG.CANVAS_HEIGHT / 2,
      velocityX: GAME_CONFIG.BALL_INITIAL_SPEED * Math.cos(angle) * directionX,
      velocityY: GAME_CONFIG.BALL_INITIAL_SPEED * Math.sin(angle),
      speed: GAME_CONFIG.BALL_INITIAL_SPEED,
    };
  }

  private createPlayer(userId: number): PlayerState {
    return {
      userId,
      paddleY:
        (GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.PADDLE_HEIGHT) / 2,
      score: 0,
      connected: false,
      socketId: null,
      direction: 'stop',
    };
  }

  private clearGameLoop(matchId: number): void {
    const interval = this.gameLoops.get(matchId);
    if (interval) {
      clearInterval(interval);
      this.gameLoops.delete(matchId);
    }
  }

  private clearBroadcastLoop(matchId: number): void {
    const interval = this.broadcastLoops.get(matchId);
    if (interval) {
      clearInterval(interval);
      this.broadcastLoops.delete(matchId);
    }
  }
}
