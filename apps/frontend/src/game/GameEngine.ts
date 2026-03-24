import { GameState, GameConfig } from '../types';

export interface GameSettings {
  ballSpeed: number;
  paddleSize: number;
  winScore: number;
  ballSize?: number;
  ballAcceleration?: number;  // 추가됨
  paddleSpeed?: number;       // 추가됨
  theme?: 'classic' | 'neon' | 'retro';
}

export class GameEngine {
  private config: GameConfig;
  public state: GameState;
  private settings: GameSettings;

  constructor(config: GameConfig, settings?: Partial<GameSettings>) {
    // 기본 설정과 커스텀 설정 병합
    this.settings = {
      ballSpeed: settings?.ballSpeed ?? 5,
      paddleSize: settings?.paddleSize ?? 100,
      winScore: settings?.winScore ?? 5,
      ballSize: settings?.ballSize ?? 10,
      ballAcceleration: settings?.ballAcceleration ?? 1.05,  // 기본값 추가
      paddleSpeed: settings?.paddleSpeed ?? config.paddleSpeed,
      theme: settings?.theme ?? 'classic',
    };
    
    // GameConfig를 GameSettings와 병합하여 업데이트
    this.config = {
      ...config,
      ballRadius: settings?.ballSize ?? config.ballRadius,
      paddleHeight: settings?.paddleSize ?? config.paddleHeight,
      winningScore: settings?.winScore ?? config.winningScore,
      paddleSpeed: settings?.paddleSpeed ?? config.paddleSpeed,
    };
    
    this.state = this.getInitialState();
  }

  private getInitialState(): GameState {
    const { canvasWidth, canvasHeight, orientation } = this.config;
    
    // GameSettings에서 커스텀 값 사용
    const paddleWidth = this.config.paddleWidth;
    const paddleHeight = this.settings.paddleSize;
    const ballRadius = this.settings.ballSize ?? this.config.ballRadius;
    const paddleSpeed = this.settings.paddleSpeed ?? this.config.paddleSpeed;
    const baseBallSpeed = this.settings.ballSpeed;

    if (orientation === 'vertical') {
      const horizontalPaddleWidth = paddleHeight;
      const horizontalPaddleHeight = paddleWidth;

      return {
        ball: {
          position: { x: canvasWidth / 2, y: canvasHeight / 2 },
          velocity: { 
            x: (Math.random() - 0.5) * baseBallSpeed * 1.2,
            y: (Math.random() > 0.5 ? 1 : -1) * baseBallSpeed 
          },
          radius: ballRadius,
        },
        paddle1: {
          position: {
            x: canvasWidth / 2 - horizontalPaddleWidth / 2,
            y: canvasHeight - 20 - horizontalPaddleHeight
          },
          size: { width: horizontalPaddleWidth, height: horizontalPaddleHeight },
          speed: paddleSpeed,
        },
        paddle2: {
          position: {
            x: canvasWidth / 2 - horizontalPaddleWidth / 2,
            y: 20
          },
          size: { width: horizontalPaddleWidth, height: horizontalPaddleHeight },
          speed: paddleSpeed,
        },
        score: { player1: 0, player2: 0 },
        isPlaying: false,
        winner: null,
        orientation,
        theme: this.settings.theme,
      };
    } else {
      return {
        ball: {
          position: { x: canvasWidth / 2, y: canvasHeight / 2 },
          velocity: { 
            x: (Math.random() > 0.5 ? 1 : -1) * baseBallSpeed,
            y: (Math.random() - 0.5) * baseBallSpeed * 1.2
          },
          radius: ballRadius,
        },
        paddle1: {
          position: { x: 20, y: canvasHeight / 2 - paddleHeight / 2 },
          size: { width: paddleWidth, height: paddleHeight },
          speed: paddleSpeed,
        },
        paddle2: {
          position: { 
            x: canvasWidth - 20 - paddleWidth, 
            y: canvasHeight / 2 - paddleHeight / 2 
          },
          size: { width: paddleWidth, height: paddleHeight },
          speed: paddleSpeed,
        },
        score: { player1: 0, player2: 0 },
        isPlaying: false,
        winner: null,
        orientation,
        theme: this.settings.theme,
      };
    }
  }

  public reset(): void {
    this.state = this.getInitialState();
  }

  public start(): void {
    this.state.isPlaying = true;
  }

  public pause(): void {
    this.state.isPlaying = false;
  }

  public update(): void {
    if (!this.state.isPlaying || this.state.winner) return;

    this.updateBall();
    this.checkCollisions();
    this.checkScore();
  }

  private updateBall(): void {
    // ballSpeed 설정에 따른 속도 조절
    const maxSpeed = this.settings.ballSpeed * 1.5;
    
    // 속도 제한 적용
    const currentSpeed = Math.sqrt(
      this.state.ball.velocity.x ** 2 + 
      this.state.ball.velocity.y ** 2
    );
    
    if (currentSpeed > maxSpeed) {
      const scale = maxSpeed / currentSpeed;
      this.state.ball.velocity.x *= scale;
      this.state.ball.velocity.y *= scale;
    }
    
    this.state.ball.position.x += this.state.ball.velocity.x;
    this.state.ball.position.y += this.state.ball.velocity.y;
  }

  private checkCollisions(): void {
    if (this.state.orientation === 'vertical') {
      this.checkCollisionsVertical();
    } else {
      this.checkCollisionsHorizontal();
    }
  }

  private checkCollisionsHorizontal(): void {
    const { ball } = this.state;
    const { canvasHeight } = this.config;

    // Top and bottom wall collision
    if (ball.position.y - ball.radius <= 0 || ball.position.y + ball.radius >= canvasHeight) {
      ball.velocity.y *= -1;
      ball.position.y = ball.position.y - ball.radius <= 0
        ? ball.radius
        : canvasHeight - ball.radius;
    }

    // Paddle collision
    this.checkPaddleCollisionHorizontal(this.state.paddle1);
    this.checkPaddleCollisionHorizontal(this.state.paddle2);
  }

  private checkCollisionsVertical(): void {
    const { ball } = this.state;
    const { canvasWidth } = this.config;

    // Left and right wall collision
    if (ball.position.x - ball.radius <= 0 || ball.position.x + ball.radius >= canvasWidth) {
      ball.velocity.x *= -1;
      ball.position.x = ball.position.x - ball.radius <= 0
        ? ball.radius
        : canvasWidth - ball.radius;
    }

    // Paddle collision
    this.checkPaddleCollisionVertical(this.state.paddle1);
    this.checkPaddleCollisionVertical(this.state.paddle2);
  }

  private checkPaddleCollisionHorizontal(paddle: GameState['paddle1']): void {
    const { ball } = this.state;
    const baseSpeed = this.settings.ballSpeed;
    const acceleration = this.settings.ballAcceleration ?? 1.05;  // ballAcceleration 사용

    const ballLeft = ball.position.x - ball.radius;
    const ballRight = ball.position.x + ball.radius;
    const ballTop = ball.position.y - ball.radius;
    const ballBottom = ball.position.y + ball.radius;

    const paddleLeft = paddle.position.x;
    const paddleRight = paddle.position.x + paddle.size.width;
    const paddleTop = paddle.position.y;
    const paddleBottom = paddle.position.y + paddle.size.height;

    if (
      ballRight >= paddleLeft &&
      ballLeft <= paddleRight &&
      ballBottom >= paddleTop &&
      ballTop <= paddleBottom
    ) {
      const hitPos = (ball.position.y - (paddle.position.y + paddle.size.height / 2)) / (paddle.size.height / 2);
      
      // ballAcceleration 설정 사용
      ball.velocity.x *= -acceleration;
      ball.velocity.y = hitPos * baseSpeed * 1.6;

      if (ball.velocity.x > 0) {
        ball.position.x = paddleRight + ball.radius;
      } else {
        ball.position.x = paddleLeft - ball.radius;
      }
    }
  }

  private checkPaddleCollisionVertical(paddle: GameState['paddle1']): void {
    const { ball } = this.state;
    const baseSpeed = this.settings.ballSpeed;
    const acceleration = this.settings.ballAcceleration ?? 1.05;  // ballAcceleration 사용

    const ballLeft = ball.position.x - ball.radius;
    const ballRight = ball.position.x + ball.radius;
    const ballTop = ball.position.y - ball.radius;
    const ballBottom = ball.position.y + ball.radius;

    const paddleLeft = paddle.position.x;
    const paddleRight = paddle.position.x + paddle.size.width;
    const paddleTop = paddle.position.y;
    const paddleBottom = paddle.position.y + paddle.size.height;

    if (
      ballRight >= paddleLeft &&
      ballLeft <= paddleRight &&
      ballBottom >= paddleTop &&
      ballTop <= paddleBottom
    ) {
      const hitPos = (ball.position.x - (paddle.position.x + paddle.size.width / 2)) / (paddle.size.width / 2);
      
      // ballAcceleration 설정 사용
      ball.velocity.y *= -acceleration;
      ball.velocity.x = hitPos * baseSpeed * 1.6;

      if (ball.velocity.y > 0) {
        ball.position.y = paddleBottom + ball.radius;
      } else {
        ball.position.y = paddleTop - ball.radius;
      }
    }
  }

  private checkScore(): void {
    const { ball } = this.state;
    const { canvasWidth, canvasHeight } = this.config;
    const winScore = this.settings.winScore;

    if (this.state.orientation === 'vertical') {
      if (ball.position.y + ball.radius < 0) {
        this.state.score.player1++;
        this.resetBall();
      } else if (ball.position.y - ball.radius > canvasHeight) {
        this.state.score.player2++;
        this.resetBall();
      }
    } else {
      if (ball.position.x + ball.radius < 0) {
        this.state.score.player2++;
        this.resetBall();
      } else if (ball.position.x - ball.radius > canvasWidth) {
        this.state.score.player1++;
        this.resetBall();
      }
    }

    // Check for winner with custom winScore
    if (this.state.score.player1 >= winScore) {
      this.state.winner = 'player1';
      this.state.isPlaying = false;
    } else if (this.state.score.player2 >= winScore) {
      this.state.winner = 'player2';
      this.state.isPlaying = false;
    }
  }

  private resetBall(): void {
    const { canvasWidth, canvasHeight } = this.config;
    this.state.ball.position = { x: canvasWidth / 2, y: canvasHeight / 2 };

    const baseSpeed = this.settings.ballSpeed;
    const randomFactor = 1.2;

    if (this.state.orientation === 'vertical') {
      this.state.ball.velocity = {
        x: (Math.random() - 0.5) * baseSpeed * randomFactor,
        y: (Math.random() > 0.5 ? 1 : -1) * baseSpeed,
      };
    } else {
      this.state.ball.velocity = {
        x: (Math.random() > 0.5 ? 1 : -1) * baseSpeed,
        y: (Math.random() - 0.5) * baseSpeed * randomFactor,
      };
    }
  }

  // 게임 설정 업데이트 메서드 추가
  public updateSettings(newSettings: Partial<GameSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    
    // 설정 변경 시 관련 값 업데이트
    if (newSettings.paddleSize !== undefined) {
      if (this.state.orientation === 'vertical') {
        const horizontalPaddleWidth = newSettings.paddleSize;
        this.state.paddle1.size.width = horizontalPaddleWidth;
        this.state.paddle2.size.width = horizontalPaddleWidth;
      } else {
        this.state.paddle1.size.height = newSettings.paddleSize;
        this.state.paddle2.size.height = newSettings.paddleSize;
      }
    }
    
    if (newSettings.ballSize !== undefined) {
      this.state.ball.radius = newSettings.ballSize;
    }
    
    if (newSettings.paddleSpeed !== undefined) {
      this.state.paddle1.speed = newSettings.paddleSpeed;
      this.state.paddle2.speed = newSettings.paddleSpeed;
    }
    
    if (newSettings.theme) {
      this.state.theme = newSettings.theme;
    }
  }

  // 현재 설정 가져오기
  public getSettings(): GameSettings {
    return { ...this.settings };
  }

  // Move paddle methods
  public movePaddle1Negative(): void {
    const paddle = this.state.paddle1;
    if (this.state.orientation === 'vertical') {
      paddle.position.x = Math.max(0, paddle.position.x - paddle.speed);
    } else {
      paddle.position.y = Math.max(0, paddle.position.y - paddle.speed);
    }
  }

  public movePaddle1Positive(): void {
    const paddle = this.state.paddle1;
    if (this.state.orientation === 'vertical') {
      const maxX = this.config.canvasWidth - paddle.size.width;
      paddle.position.x = Math.min(maxX, paddle.position.x + paddle.speed);
    } else {
      const maxY = this.config.canvasHeight - paddle.size.height;
      paddle.position.y = Math.min(maxY, paddle.position.y + paddle.speed);
    }
  }

  public movePaddle2Negative(): void {
    const paddle = this.state.paddle2;
    if (this.state.orientation === 'vertical') {
      paddle.position.x = Math.max(0, paddle.position.x - paddle.speed);
    } else {
      paddle.position.y = Math.max(0, paddle.position.y - paddle.speed);
    }
  }

  public movePaddle2Positive(): void {
    const paddle = this.state.paddle2;
    if (this.state.orientation === 'vertical') {
      const maxX = this.config.canvasWidth - paddle.size.width;
      paddle.position.x = Math.min(maxX, paddle.position.x + paddle.speed);
    } else {
      const maxY = this.config.canvasHeight - paddle.size.height;
      paddle.position.y = Math.min(maxY, paddle.position.y + paddle.speed);
    }
  }
}