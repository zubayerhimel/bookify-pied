import { useCallback, useEffect, useState } from "react";

export type ReadingMode = "light" | "sepia" | "green" | "dark" | "midnight";

// Single source of truth, ordered light → dark for cycling and UI.
export const READING_MODES: ReadingMode[] = ["light", "sepia", "green", "dark", "midnight"];

const STORAGE_KEY = "kindle-reader-mode";

// The <html> classes each mode applies. 'light' uses the default :root palette.
// 'midnight' layers over '.dark' so dark: utilities (e.g. highlight blend) still apply.
const MODE_CLASSES: Record<ReadingMode, string[]> = {
  light: [],
  sepia: ["sepia"],
  green: ["green"],
  dark: ["dark"],
  midnight: ["dark", "midnight"],
};
const ALL_MODE_CLASSES = ["sepia", "green", "dark", "midnight"];

export function useReadingMode() {
  const [mode, setMode] = useState<ReadingMode>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && (READING_MODES as string[]).includes(stored)) {
        return stored as ReadingMode;
      }
    }
    return "light";
  });

  useEffect(() => {
    const root = document.documentElement;

    // Reset, then apply the current mode's classes.
    root.classList.remove(...ALL_MODE_CLASSES);
    root.classList.add(...MODE_CLASSES[mode]);

    // Persist to localStorage
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  const toggleMode = useCallback(() => {
    setMode((current) => {
      const currentIndex = READING_MODES.indexOf(current);
      return READING_MODES[(currentIndex + 1) % READING_MODES.length];
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
