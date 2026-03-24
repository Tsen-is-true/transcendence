import { useEffect, useRef } from 'react';
import { GameState } from '../../types';

interface LocalGameCanvasProps {
  gameState: GameState;
  width: number;
  height: number;
  theme?: string;
}

export function LocalGameCanvas({ gameState, width, height, theme }: LocalGameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const isXerath = theme === 'xerath';

    // Clear canvas
    ctx.fillStyle = isXerath ? '#030614' : '#000';
    ctx.fillRect(0, 0, width, height);

    // Draw center line
    ctx.strokeStyle = isXerath ? 'rgba(0, 242, 255, 0.4)' : '#444';
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw ball
    if (isXerath) {
      ctx.shadowColor = '#00f2ff';
      ctx.shadowBlur = 25;
      ctx.fillStyle = '#00f2ff';
    } else {
      ctx.fillStyle = '#fff';
      ctx.shadowBlur = 0;
    }
    
    ctx.beginPath();
    ctx.arc(
      gameState.ball.position.x,
      gameState.ball.position.y,
      gameState.ball.radius,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Draw paddle 1
    if (isXerath) {
      ctx.shadowColor = '#00f2ff';
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#00f2ff';
    } else {
      ctx.fillStyle = '#4ade80';
      ctx.shadowBlur = 0;
    }
    ctx.fillRect(
      gameState.paddle1.position.x,
      gameState.paddle1.position.y,
      gameState.paddle1.size.width,
      gameState.paddle1.size.height
    );

    // Draw paddle 2
    if (isXerath) {
      ctx.shadowColor = '#ffaa00'; // Golden Shuriman Edge
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#ffaa00';
    } else {
      ctx.fillStyle = '#f87171';
      ctx.shadowBlur = 0;
    }
    ctx.fillRect(
      gameState.paddle2.position.x,
      gameState.paddle2.position.y,
      gameState.paddle2.size.width,
      gameState.paddle2.size.height
    );

    // Reset shadow
    ctx.shadowBlur = 0;

    // Draw scores
    ctx.font = '48px monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(gameState.score.player1.toString(), width / 4, 60);
    ctx.fillText(gameState.score.player2.toString(), (width * 3) / 4, 60);

    // Draw winner message
    if (gameState.winner) {
      ctx.font = 'bold 32px monospace';
      ctx.fillStyle = gameState.winner === 'player1' ? '#4ade80' : '#f87171';
      ctx.fillText(
        gameState.winner === 'player1' ? 'PLAYER 1 WINS!' : 'PLAYER 2 WINS!',
        width / 2,
        height / 2
      );
    }
  }, [gameState, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="border-2 sm:border-4 border-cyan-500/30 rounded-xl shadow-2xl shadow-cyan-900/30 w-full h-auto backdrop-blur-sm"
      style={{ maxWidth: '100%', height: 'auto' }}
    />
  );
}
