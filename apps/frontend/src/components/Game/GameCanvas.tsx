"use client";
import { useEffect, useRef } from 'react';

interface OnlineGameCanvasProps {
  gameState: {
    canvas?: {
      width: number;
      height: number;
    };
    ball: {
      x: number;
      y: number;
      radius: number;
      velocityX: number;
      velocityY: number;
      speed: number;
    };
    paddle1: {
      x: number;
      y: number;
      width: number;
      height: number;
      score: number;
    };
    paddle2: {
      x: number;
      y: number;
      width: number;
      height: number;
      score: number;
    };
    winningScore: number;
    winner: 'player1' | 'player2' | null;
    isPlaying: boolean;
  };
  playerNumber?: 1 | 2;
}

export function GameCanvas({ gameState, playerNumber }: OnlineGameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // canvas 정보가 없으면 렌더하지 않음 (SSR-safe)
  if (!gameState.canvas) {
    return null;
  }

  const { width, height } = gameState.canvas;

  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);

    // center line
    ctx.strokeStyle = '#444';
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();
    ctx.setLineDash([]);

    // ball
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(
      gameState.ball.x,
      gameState.ball.y,
      gameState.ball.radius,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // paddle1
    ctx.fillStyle = playerNumber === 1 ? '#4ade80' : '#fff';
    ctx.fillRect(
      gameState.paddle1.x,
      gameState.paddle1.y,
      gameState.paddle1.width,
      gameState.paddle1.height
    );

    // paddle2
    ctx.fillStyle = playerNumber === 2 ? '#4ade80' : '#fff';
    ctx.fillRect(
      gameState.paddle2.x,
      gameState.paddle2.y,
      gameState.paddle2.width,
      gameState.paddle2.height
    );

    // scores
    ctx.font = '48px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.fillText(String(gameState.paddle1.score), width / 4, 60);
    ctx.fillText(String(gameState.paddle2.score), (width * 3) / 4, 60);

    // winner
    if (gameState.winner) {
      ctx.font = 'bold 32px monospace';
      ctx.fillStyle = gameState.winner === 'player1' ? '#4ade80' : '#f87171';
      ctx.fillText(
        gameState.winner === 'player1' ? 'PLAYER 1 WINS!' : 'PLAYER 2 WINS!',
        width / 2,
        height / 2
      );
    }

  }, [gameState, width, height, playerNumber]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="border-4 border-gray-700 rounded-lg shadow-2xl bg-black"
      style={{ maxWidth: '100%', height: 'auto' }}
    />
  );
}
