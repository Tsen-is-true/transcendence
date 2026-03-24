import { useEffect, useRef } from 'react';

export function useKeyboard() {
  const keysPressed = useRef<Set<string>>(new Set());

  useEffect(() => {
    const gameKeys = new Set([
      'w', 'W', 's', 'S',
      'a', 'A', 'd', 'D',
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'
    ]);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameKeys.has(e.key)) {
        e.preventDefault();
      }
      keysPressed.current.add(e.key);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (gameKeys.has(e.key)) {
        e.preventDefault();
      }
      keysPressed.current.delete(e.key);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return { keysPressed };
}
