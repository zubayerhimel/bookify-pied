import type { PDFDocumentProxy } from "pdfjs-dist";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildPageTextIndex, findMatches, type PageTextIndex } from "@/components/reader/pdfSearch";

interface Match {
  id: number;
  page: number;
  start: number;
  end: number;
}

export interface CurrentPageMatch {
  id: number;
  active: boolean;
}

interface UseDocumentSearchArgs {
  pdf: PDFDocumentProxy | null;
  numPages: number;
  currentPage: number;
  onNavigate: (page: number) => void;
}

export function useDocumentSearch({ pdf, numPages, currentPage, onNavigate }: UseDocumentSearchArgs) {
  const [query, setQueryState] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [indexing, setIndexing] = useState(false);

  const cacheRef = useRef<Map<number, PageTextIndex>>(new Map());
  const buildTokenRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Mirror state into refs so stable callbacks read fresh values.
  const matchesRef = useRef(matches);
  matchesRef.current = matches;
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;
  const currentPageRef = useRef(currentPage);
  currentPageRef.current = currentPage;

  // Reset everything when the document changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the reset must re-run whenever the pdf proxy changes, even though its body doesn't read pdf.
  useEffect(() => {
    cacheRef.current = new Map();
    buildTokenRef.current += 1;
    setMatches([]);
    setActiveId(null);
    setQueryState("");
    setIndexing(false);
  }, [pdf]);

  const ensureIndexed = useCallback(async (): Promise<Map<number, PageTextIndex>> => {
    const cache = cacheRef.current;
    if (!pdf || numPages < 1 || cache.size >= numPages) return cache;

    const token = buildTokenRef.current;
    setIndexing(true);
    try {
      for (let page = 1; page <= numPages; page++) {
        if (cache.has(page)) continue;
        try {
          const loaded = await pdf.getPage(page);
          const content = await loaded.getTextContent();
          if (buildTokenRef.current !== token) return cache;
          const items = content.items.filter((item): item is { str: string } => typeof (item as { str?: unknown }).str === "string");
          cache.set(page, buildPageTextIndex(items));
        } catch {
          cache.set(page, { text: "", itemStart: [], itemLen: [] });
        }
      }
    } finally {
      if (buildTokenRef.current === token) setIndexing(false);
    }
    return cache;
  }, [pdf, numPages]);

  const runSearch = useCallback(
    async (rawQuery: string) => {
      const normalized = rawQuery.trim().toLowerCase();
      if (!normalized) {
        setMatches([]);
        setActiveId(null);
        return;
      }

      const cache = await ensureIndexed();
      const found: Match[] = [];
      let id = 0;
      for (let page = 1; page <= numPages; page++) {
        const index = cache.get(page);
        if (!index) continue;
        for (const match of findMatches(index, normalized)) {
          found.push({ id: id++, page, start: match.start, end: match.end });
        }
      }

      setMatches(found);
      if (found.length === 0) {
        setActiveId(null);
        return;
      }

      const here = currentPageRef.current;
      const chosen = found.find((m) => m.page === here) ?? found.find((m) => m.page > here) ?? found[0];
      setActiveId(chosen.id);
      if (chosen.page !== here) onNavigate(chosen.page);
    },
    [ensureIndexed, numPages, onNavigate],
  );

  const setQuery = useCallback(
    (value: string) => {
      setQueryState(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void runSearch(value);
      }, 160);
    },
    [runSearch],
  );

  const goToMatch = useCallback(
    (id: number) => {
      setActiveId(id);
      const match = matchesRef.current.find((m) => m.id === id);
      if (match && match.page !== currentPageRef.current) {
        onNavigate(match.page);
      }
    },
    [onNavigate],
  );

  const step = useCallback(
    (direction: 1 | -1) => {
      const list = matchesRef.current;
      if (list.length === 0) return;
      const currentIndex = list.findIndex((m) => m.id === activeIdRef.current);
      const nextIndex = ((currentIndex === -1 ? 0 : currentIndex + direction) + list.length) % list.length;
      goToMatch(list[nextIndex].id);
    },
    [goToMatch],
  );

  const next = useCallback(() => step(1), [step]);
  const prev = useCallback(() => step(-1), [step]);

  const clear = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setQueryState("");
    setMatches([]);
    setActiveId(null);
  }, []);

  const prefetch = useCallback(() => {
    void ensureIndexed();
  }, [ensureIndexed]);

  const activeOrdinal = activeId === null ? 0 : matches.findIndex((m) => m.id === activeId) + 1;

  const currentPageMatches = useMemo<CurrentPageMatch[]>(() => {
    if (!query.trim()) return [];
    return matches.filter((m) => m.page === currentPage).map((m) => ({ id: m.id, active: m.id === activeId }));
  }, [matches, currentPage, activeId, query]);

  return {
    query,
    setQuery,
    clear,
    prefetch,
    indexing,
    total: matches.length,
    activeOrdinal,
    next,
    prev,
    currentPageMatches,
  };
}
