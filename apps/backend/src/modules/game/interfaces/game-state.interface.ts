export type PaddleDirection = 'up' | 'down' | 'stop';
export type GameStatus = 'countdown' | 'playing' | 'paused' | 'finished';

export interface PlayerState {
  userId: number;
  paddleY: number;
  score: number;
  connected: boolean;
  socketId: string | null;
  direction: PaddleDirection;
}

export interface BallState {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  speed: number;
}

export interface GameState {
  matchId: number;
  roomId: number;
  status: GameStatus;
  ball: BallState;
  players: {
    player1: PlayerState;
    player2: PlayerState;
  };
  rallyCount: number;
  lastUpdateAt: number;
}

export interface MinimizedGameState {
  b: { x: number; y: number };
  p1: { y: number; s: number };
  p2: { y: number; s: number };
  t: number;
}

export interface ScoreEvent {
  player1Score: number;
  player2Score: number;
  scorerId: number;
  isGameOver: boolean;
  winnerId?: number;
}
