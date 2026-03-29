import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const getSocketUrl = () =>
  (import.meta as any).env?.VITE_SOCKET_URL ||
  (typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:3000`
    : 'http://localhost:3000');


export interface ServerGameState {
  canvas: { width: number; height: number };
  ball: { x: number; y: number; radius: number; velocityX: number; velocityY: number; speed: number };
  paddle1: { x: number; y: number; width: number; height: number; score: number };
  paddle2: { x: number; y: number; width: number; height: number; score: number };
  winningScore: number;
  winner: 'player1' | 'player2' | null;
  isPlaying: boolean;
}

export interface GameResultPayload {
  winnerId: number;
  roomId?: number;
  reason?: string;
  round?: number;
  isTournament?: boolean;
  finalScore: {
    player1Score: number;
    player2Score: number;
  };
}

export type GameStatus = 'connecting' | 'countdown' | 'playing' | 'paused' | 'ended' | 'error';

export function useGameSocket(matchId: number | null) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [status, setStatus] = useState<GameStatus>('connecting');
  const [gameState, setGameState] = useState<ServerGameState | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [result, setResult] = useState<GameResultPayload | null>(null);
  const [playerNumber, setPlayerNumber] = useState<1 | 2>(1);

  useEffect(() => {
    if (!matchId) return;

    const token = sessionStorage.getItem('accessToken');
    if (!token) {
      setError('Not authenticated');
      return;
    }

    console.log(`🔌 Connecting to /game for match ${matchId}...`);
    const newSocket = io(`${getSocketUrl()}/game`, {
      auth: { token },
      reconnection: true,
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('✅ Connected to /game:', newSocket.id);
      setIsConnected(true);
      setError(null);
      // Join the game socket room
      newSocket.emit('game:join', { matchId });
    });

    newSocket.on('connect_error', (err) => {
      console.error('❌ /game Connection error:', err.message);
      // We don't set status='error' here so the UI doesn't break. 
      // Socket.io will automatically try to reconnect.
      setIsConnected(false);
    });

    newSocket.on('game:error', (err: { message: string }) => {
      console.error('❌ /game logic error:', err.message);
      setError(err.message);
      setStatus('error');
    });

    newSocket.on('disconnect', () => {
      console.log('👋 Disconnected from /game');
      setIsConnected(false);
    });

    newSocket.on('game:countdown', (data: { seconds: number }) => {
      setStatus('countdown');
      setCountdown(data.seconds);
    });

    newSocket.on('game:start', () => {
      setStatus('playing');
      setCountdown(null);
    });

    newSocket.on('game:state', (state: any) => {
      const expandedState: ServerGameState = {
        canvas: { width: 800, height: 600 },
        ball: {
          x: state.b.x,
          y: state.b.y,
          radius: 5, // BALL_SIZE: 10 / 2
          velocityX: 0,
          velocityY: 0,
          speed: 0,
        },
        paddle1: {
          x: 20, // PADDLE_MARGIN
          y: state.p1.y,
          width: 10, // PADDLE_WIDTH
          height: 100, // PADDLE_HEIGHT
          score: state.p1.s,
        },
        paddle2: {
          x: 800 - 20 - 10, // CANVAS_WIDTH - PADDLE_MARGIN - PADDLE_WIDTH
          y: state.p2.y,
          width: 10,
          height: 100,
          score: state.p2.s,
        },
        winningScore: 11,
        winner: null,
        isPlaying: true,
      };

      setGameState(expandedState);
      // Wait: status may check against a closure of 'connecting' but trigger correctly
      setStatus((prev) => {
        if (prev === 'ended') return prev;
        return prev !== 'playing' ? 'playing' : prev;
      });
    });

    newSocket.on('game:score', (data) => {
      console.log('game:score', data);
      // UI can play a sound effect here
    });

    newSocket.on('game:pause', (data) => {
      console.log('game:pause', data);
      setStatus('paused');
    });

    newSocket.on('game:resume', () => {
      console.log('game:resume');
      setStatus('playing');
    });

    newSocket.on('game:end', (data) => {
      console.log('🏁 game:end', data);
      setStatus('ended');
      setResult(data);
    });

    newSocket.on('game:role', (data: { playerNumber: 1 | 2 }) => {
      console.log('🎮 Assigned player number:', data.playerNumber);
      setPlayerNumber(data.playerNumber);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [matchId]);

  // Actions
  const movePaddle = useCallback((direction: 'up' | 'down' | 'stop') => {
    if (socket && isConnected && status === 'playing') {
      socket.emit('game:paddle', { direction });
    }
  }, [socket, isConnected, status]);

  const surrenderGame = useCallback(() => {
    if (socket && isConnected && matchId) {
      socket.emit('game:surrender', { matchId });
    }
  }, [socket, isConnected, matchId]);

  const ping = useCallback(() => {
    if (socket && isConnected) {
      socket.emit('game:ping', { timestamp: Date.now() });
    }
  }, [socket, isConnected]);

  return {
    socket,
    isConnected,
    error,
    status,
    gameState,
    countdown,
    result,
    playerNumber,
    actions: {
      movePaddle,
      ping,
      surrenderGame
    }
  };
}
