import { useState, useEffect } from 'react';

export type Orientation = 'horizontal' | 'vertical';

const MOBILE_BREAKPOINT = 768;

export function useOrientation() {
  const [orientation, setOrientation] = useState<Orientation>(() =>
    window.innerWidth < MOBILE_BREAKPOINT ? 'vertical' : 'horizontal'
  );

  useEffect(() => {
    const handleResize = () => {
      setOrientation(
        window.innerWidth < MOBILE_BREAKPOINT ? 'vertical' : 'horizontal'
      );
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return orientation;
}
