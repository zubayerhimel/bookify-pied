import { useCallback, useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  deleteBookmark as dbDeleteBookmark,
  deleteHighlight as dbDeleteHighlight,
  deleteNote as dbDeleteNote,
  deleteQuote as dbDeleteQuote,
  getBookmarksByPdf,
  getHighlightsByPdf,
  getNotesByPdf,
  getQuotesByPdf,
  saveBookmark,
  saveHighlight,
  saveNote,
  saveQuote,
} from "@/lib/db/database";
import type { Bookmark, Highlight, HighlightColor, HighlightRect, Note, Quote } from "@/lib/db/types";

export function useAnnotations(pdfId: string | null) {
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(false);

  const bookmarksRef = useRef(bookmarks);
  bookmarksRef.current = bookmarks;

  const loadAnnotations = useCallback(async () => {
    if (!pdfId) return;

    setLoading(true);
    try {
      const [h, q, n, b] = await Promise.all([getHighlightsByPdf(pdfId), getQuotesByPdf(pdfId), getNotesByPdf(pdfId), getBookmarksByPdf(pdfId)]);
      setHighlights(h);
      setQuotes(q);
      setNotes(n);
      setBookmarks(b);
    } catch (err) {
      console.error("Error loading annotations:", err);
    } finally {
      setLoading(false);
    }
  }, [pdfId]);

  useEffect(() => {
    loadAnnotations();
  }, [loadAnnotations]);

  // Highlight operations
  const addHighlight = useCallback(
    async (pageNumber: number, text: string, color: HighlightColor, rects: HighlightRect[]): Promise<Highlight | null> => {
      if (!pdfId) return null;

      const highlight: Highlight = {
        id: uuidv4(),
        pdfId,
        pageNumber,
        text,
        color,
        rects,
        createdAt: new Date(),
      };

      try {
        await saveHighlight(highlight);
        setHighlights((prev) => [...prev, highlight]);
        return highlight;
      } catch (err) {
        console.error("Error saving highlight:", err);
        return null;
      }
    },
    [pdfId],
  );

  const removeHighlight = useCallback(async (id: string): Promise<void> => {
    try {
      await dbDeleteHighlight(id);
      setHighlights((prev) => prev.filter((h) => h.id !== id));
    } catch (err) {
      console.error("Error deleting highlight:", err);
    }
  }, []);

  const getHighlightsForPage = useCallback(
    (pageNumber: number): Highlight[] => {
      return highlights.filter((h) => h.pageNumber === pageNumber);
    },
    [highlights],
  );

  // Quote operations
  const addQuote = useCallback(
    async (pageNumber: number, text: string): Promise<Quote | null> => {
      if (!pdfId) return null;

      const quote: Quote = {
        id: uuidv4(),
        pdfId,
        pageNumber,
        text,
        createdAt: new Date(),
      };

      try {
        await saveQuote(quote);
        setQuotes((prev) => [...prev, quote]);
        return quote;
      } catch (err) {
        console.error("Error saving quote:", err);
        return null;
      }
    },
    [pdfId],
  );

  const removeQuote = useCallback(async (id: string): Promise<void> => {
    try {
      await dbDeleteQuote(id);
      setQuotes((prev) => prev.filter((q) => q.id !== id));
    } catch (err) {
      console.error("Error deleting quote:", err);
    }
  }, []);

  // Note operations
  const addNote = useCallback(
    async (pageNumber: number, content: string, linkedText?: string): Promise<Note | null> => {
      if (!pdfId) return null;

      const now = new Date();
      const note: Note = {
        id: uuidv4(),
        pdfId,
        pageNumber,
        linkedText,
        content,
        createdAt: now,
        updatedAt: now,
      };

      try {
        await saveNote(note);
        setNotes((prev) => [...prev, note]);
        return note;
      } catch (err) {
        console.error("Error saving note:", err);
        return null;
      }
    },
    [pdfId],
  );

  const updateNote = useCallback(
    async (id: string, content: string): Promise<void> => {
      const note = notes.find((n) => n.id === id);
      if (!note) return;

      const updated: Note = {
        ...note,
        content,
        updatedAt: new Date(),
      };

      try {
        await saveNote(updated);
        setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
      } catch (err) {
        console.error("Error updating note:", err);
      }
    },
    [notes],
  );

  const removeNote = useCallback(async (id: string): Promise<void> => {
    try {
      await dbDeleteNote(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error("Error deleting note:", err);
    }
  }, []);

  const getNotesForPage = useCallback(
    (pageNumber: number): Note[] => {
      return notes.filter((n) => n.pageNumber === pageNumber);
    },
    [notes],
  );

  // Bookmark operations
  const addBookmark = useCallback(
    async (pageNumber: number, label?: string): Promise<Bookmark | null> => {
      if (!pdfId) return null;

      const bookmark: Bookmark = {
        id: uuidv4(),
        pdfId,
        pageNumber,
        label,
        createdAt: new Date(),
      };

      try {
        await saveBookmark(bookmark);
        setBookmarks((prev) => [...prev, bookmark].sort((a, b) => a.pageNumber - b.pageNumber));
        return bookmark;
      } catch (err) {
        console.error("Error saving bookmark:", err);
        return null;
      }
    },
    [pdfId],
  );

  const removeBookmark = useCallback(async (id: string): Promise<void> => {
    try {
      await dbDeleteBookmark(id);
      setBookmarks((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      console.error("Error deleting bookmark:", err);
    }
  }, []);

  const toggleBookmark = useCallback(
    async (pageNumber: number): Promise<void> => {
      const existing = bookmarksRef.current.find((b) => b.pageNumber === pageNumber);
      if (existing) {
        await removeBookmark(existing.id);
      } else {
        await addBookmark(pageNumber);
      }
    },
    [addBookmark, removeBookmark],
  );

  return {
    highlights,
    quotes,
    notes,
    bookmarks,
    loading,
    addHighlight,
    removeHighlight,
    getHighlightsForPage,
    addQuote,
    removeQuote,
    addNote,
    updateNote,
    removeNote,
    getNotesForPage,
    addBookmark,
    removeBookmark,
    toggleBookmark,
    refresh: loadAnnotations,
  };
}
