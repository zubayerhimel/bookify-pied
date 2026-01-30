import { useState, useEffect, useCallback } from 'react';

export type ReadingMode = 'light' | 'sepia' | 'dark';

const STORAGE_KEY = 'kindle-reader-mode';

export function useReadingMode() {
  const [mode, setMode] = useState<ReadingMode>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && ['light', 'sepia', 'dark'].includes(stored)) {
        return stored as ReadingMode;
      }
    }
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    
    // Remove all mode classes
    root.classList.remove('dark', 'sepia');
    
    // Apply the current mode
    if (mode === 'dark') {
      root.classList.add('dark');
    } else if (mode === 'sepia') {
      root.classList.add('sepia');
    }
    
    // Persist to localStorage
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  const toggleMode = useCallback(() => {
    setMode(current => {
      const modes: ReadingMode[] = ['light', 'sepia', 'dark'];
      const currentIndex = modes.indexOf(current);
      return modes[(currentIndex + 1) % modes.length];
    });
  }, []);

  const setReadingMode = useCallback((newMode: ReadingMode) => {
    setMode(newMode);
  }, []);

  return {
    mode,
    setMode: setReadingMode,
    toggleMode,
  };
}
