export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Ball {
  position: Position;
  velocity: Position;
  radius: number;
}

export interface Paddle {
  position: Position;
  size: Size;
  speed: number;
}

export type Orientation = 'horizontal' | 'vertical';
export type Theme = 'classic' | 'neon' | 'retro';

export interface GameState {
  ball: Ball;
  paddle1: Paddle; // Left (horizontal) or Bottom (vertical)
  paddle2: Paddle; // Right (horizontal) or Top (vertical)
  score: {
    player1: number;
    player2: number;
  };
  isPlaying: boolean;
  winner: 'player1' | 'player2' | null;
  orientation: Orientation;
  theme?: Theme; // theme 속성 추가 (선택적)
}

export interface GameConfig {
  canvasWidth: number;
  canvasHeight: number;
  paddleWidth: number;
  paddleHeight: number;
  ballRadius: number;
  ballSpeed: number;
  paddleSpeed: number;
  winningScore: number;
  orientation: Orientation;
}
