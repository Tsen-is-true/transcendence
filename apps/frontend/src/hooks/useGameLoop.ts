import { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine, GameSettings } from '../game/GameEngine';
import { GameConfig, GameState, Orientation } from '../types';

const MOBILE_BREAKPOINT = 768;

const getResponsiveConfig = (orientation: Orientation): GameConfig => {
  // Safe defaults for SSR
  const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

  if (orientation === 'vertical') {
    const width = Math.min(windowWidth - 32, 400);
    const height = Math.min(windowHeight - 200, width * 1.5);

    return {
      canvasWidth: width,
      canvasHeight: height,
      paddleWidth: Math.max(8, height * 0.015),
      paddleHeight: Math.max(80, width * 0.25),
      ballRadius: Math.max(8, width * 0.025),
      ballSpeed: 5,
      paddleSpeed: Math.max(8, width * 0.02),
      winningScore: 5,
      orientation,
    };
  } else {
    const width = Math.min(windowWidth - 64, 1200);
    const height = Math.min(windowHeight - 200, width * 0.6);

    return {
      canvasWidth: width,
      canvasHeight: height,
      paddleWidth: Math.max(10, width * 0.02),
      paddleHeight: Math.max(60, height * 0.15),
      ballRadius: Math.max(8, width * 0.012),
      ballSpeed: 5,
      paddleSpeed: Math.max(6, height * 0.013),
      winningScore: 5,
      orientation,
    };
  }
};

interface UseGameLoopOptions {
  keysPressed: React.RefObject<Set<string>>;
  settings?: Partial<GameSettings>;
}

export function useGameLoop({ keysPressed, settings }: UseGameLoopOptions) {
  const getOrientation = useCallback((): Orientation => {
    if (typeof window === 'undefined') return 'horizontal';
    return window.innerWidth < MOBILE_BREAKPOINT ? 'vertical' : 'horizontal';
  }, []);

  const [orientation, setOrientation] = useState<Orientation>(getOrientation);
  const [gameConfig, setGameConfig] = useState<GameConfig>(() =>
    getResponsiveConfig(getOrientation())
  );
  const gameEngineRef = useRef<GameEngine>(new GameEngine(gameConfig, settings));
  const [gameState, setGameState] = useState<GameState>(gameEngineRef.current.state);
  const animationFrameRef = useRef<number>();

  // Handle window resize and orientation change
  useEffect(() => {
    const handleResize = () => {
      const newOrientation = getOrientation();
      const newConfig = getResponsiveConfig(newOrientation);

      setOrientation(newOrientation);
      setGameConfig(newConfig);
      gameEngineRef.current = new GameEngine(newConfig, settings);
      setGameState({ ...gameEngineRef.current.state });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [getOrientation, settings]);

  // Recreate GameEngine when settings change
  useEffect(() => {
    gameEngineRef.current = new GameEngine(gameConfig, settings);
    setGameState({ ...gameEngineRef.current.state });
  }, [settings, gameConfig]);

  useEffect(() => {
    const gameLoop = () => {
      // Get current gameEngine reference (important for resize handling)
      const gameEngine = gameEngineRef.current;

      // Handle keyboard input in the game loop for smooth movement
      if (keysPressed.current) {
        const isVertical = gameEngine.state.orientation === 'vertical';

        // Player 1 controls: W/S (vertical movement) or A/D (horizontal movement)
        if (isVertical) {
          // Vertical mode: A/D for horizontal movement
          if (keysPressed.current.has('a') || keysPressed.current.has('A')) {
            gameEngine.movePaddle1Negative();
          }
          if (keysPressed.current.has('d') || keysPressed.current.has('D')) {
            gameEngine.movePaddle1Positive();
          }
        } else {
          // Horizontal mode: W/S for vertical movement
          if (keysPressed.current.has('w') || keysPressed.current.has('W')) {
            gameEngine.movePaddle1Negative();
          }
          if (keysPressed.current.has('s') || keysPressed.current.has('S')) {
            gameEngine.movePaddle1Positive();
          }
        }

        // Player 2 controls: Arrow keys (direction based on orientation)
        if (isVertical) {
          // Vertical mode: Left/Right arrows for horizontal movement
          if (keysPressed.current.has('ArrowLeft')) {
            gameEngine.movePaddle2Negative();
          }
          if (keysPressed.current.has('ArrowRight')) {
            gameEngine.movePaddle2Positive();
          }
        } else {
          // Horizontal mode: Up/Down arrows for vertical movement
          if (keysPressed.current.has('ArrowUp')) {
            gameEngine.movePaddle2Negative();
          }
          if (keysPressed.current.has('ArrowDown')) {
            gameEngine.movePaddle2Positive();
          }
        }
      }

      gameEngine.update();
      setGameState({ ...gameEngine.state });
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    if (gameState.isPlaying) {
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState.isPlaying, keysPressed]);

  const startGame = () => {
    gameEngineRef.current.start();
    setGameState({ ...gameEngineRef.current.state });
  };

  const pauseGame = () => {
    gameEngineRef.current.pause();
    setGameState({ ...gameEngineRef.current.state });
  };

  const resetGame = () => {
    gameEngineRef.current.reset();
    setGameState({ ...gameEngineRef.current.state });
  };

  // Touch control - move paddle by delta
  const movePaddleByDelta = useCallback((player: 1 | 2, delta: number) => {
    const gameEngine = gameEngineRef.current;
    const paddle = player === 1 ? gameEngine.state.paddle1 : gameEngine.state.paddle2;
    const isVertical = gameEngine.state.orientation === 'vertical';

    if (isVertical) {
      // Move horizontally
      const maxX = gameConfig.canvasWidth - paddle.size.width;
      paddle.position.x = Math.max(0, Math.min(maxX, paddle.position.x + delta));
    } else {
      // Move vertically
      const maxY = gameConfig.canvasHeight - paddle.size.height;
      paddle.position.y = Math.max(0, Math.min(maxY, paddle.position.y + delta));
    }
  }, [gameConfig]);

  return {
    gameState,
    startGame,
    pauseGame,
    resetGame,
    movePaddleByDelta,
    config: gameConfig,
    orientation,
  };
}
