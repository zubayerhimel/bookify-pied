import { useState, useEffect, useCallback, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize,
  Sun,
  Moon,
  Coffee,
  Minus,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useReader } from '@/contexts/ReaderContext';
import { useReadingMode, ReadingMode } from '@/hooks/useReadingMode';
import { useAnnotations } from '@/hooks/useAnnotations';
import { getFile, updateReadingProgress } from '@/lib/db/database';
import { SelectionToolbar } from './SelectionToolbar';
import { PageHighlights } from './PageHighlights';
import { cn } from '@/lib/utils';

import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export function PDFReader() {
  const { currentDocument, isReaderOpen, closeReader } = useReader();
  const { mode, setMode } = useReadingMode();
  const { highlights, addHighlight, addQuote, addNote, getHighlightsForPage } = useAnnotations(
    currentDocument?.id ?? null
  );

  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [fitMode, setFitMode] = useState<'width' | 'page' | 'custom'>('width');
  const [showToolbar, setShowToolbar] = useState(true);
  const [containerWidth, setContainerWidth] = useState(800);
  const [selection, setSelection] = useState<{
    text: string;
    rects: DOMRect[];
    position: { x: number; y: number };
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const toolbarTimeoutRef = useRef<NodeJS.Timeout>();
  const pageRef = useRef<HTMLDivElement>(null);

  // Load PDF file
  useEffect(() => {
    if (!currentDocument) return;

    const loadPdf = async () => {
      const file = await getFile(currentDocument.id);
      if (file) {
        setPdfData(file.data);
        setCurrentPage(currentDocument.currentPage || 1);
      }
    };

    loadPdf();
  }, [currentDocument]);

  // Update container width on resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth - 64);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Auto-hide toolbar
  const handleMouseMove = useCallback(() => {
    setShowToolbar(true);
    if (toolbarTimeoutRef.current) {
      clearTimeout(toolbarTimeoutRef.current);
    }
    toolbarTimeoutRef.current = setTimeout(() => {
      setShowToolbar(false);
    }, 3000);
  }, []);

  // Save reading progress
  useEffect(() => {
    if (!currentDocument) return;

    const saveProgress = () => {
      updateReadingProgress(currentDocument.id, currentPage, 0);
    };

    const debounced = setTimeout(saveProgress, 1000);
    return () => clearTimeout(debounced);
  }, [currentDocument, currentPage]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isReaderOpen) return;

      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          setCurrentPage((p) => Math.max(1, p - 1));
          break;
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
          setCurrentPage((p) => Math.min(numPages, p + 1));
          e.preventDefault();
          break;
        case 'Escape':
          closeReader();
          break;
        case '+':
        case '=':
          setScale((s) => Math.min(2, s + 0.1));
          setFitMode('custom');
          break;
        case '-':
          setScale((s) => Math.max(0.5, s - 0.1));
          setFitMode('custom');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isReaderOpen, numPages, closeReader]);

  // Handle text selection
  const handleTextSelection = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) {
      setSelection(null);
      return;
    }

    const text = sel.toString().trim();
    if (!text) {
      setSelection(null);
      return;
    }

    const range = sel.getRangeAt(0);
    const rects = Array.from(range.getClientRects());
    if (rects.length === 0) {
      setSelection(null);
      return;
    }

    const lastRect = rects[rects.length - 1];
    setSelection({
      text,
      rects: rects.map((r) => r),
      position: {
        x: lastRect.left + lastRect.width / 2,
        y: lastRect.bottom + 10,
      },
    });
  }, []);

  useEffect(() => {
    document.addEventListener('mouseup', handleTextSelection);
    return () => document.removeEventListener('mouseup', handleTextSelection);
  }, [handleTextSelection]);

  const handleHighlight = useCallback(
    async (color: 'yellow' | 'green' | 'blue' | 'pink') => {
      if (!selection || !pageRef.current) return;

      const pageRect = pageRef.current.getBoundingClientRect();
      const normalizedRects = selection.rects.map((r) => ({
        x: ((r.left - pageRect.left) / pageRect.width) * 100,
        y: ((r.top - pageRect.top) / pageRect.height) * 100,
        width: (r.width / pageRect.width) * 100,
        height: (r.height / pageRect.height) * 100,
      }));

      await addHighlight(currentPage, selection.text, color, normalizedRects);
      window.getSelection()?.removeAllRanges();
      setSelection(null);
    },
    [selection, currentPage, addHighlight]
  );

  const handleSaveQuote = useCallback(async () => {
    if (!selection) return;
    await addQuote(currentPage, selection.text);
    window.getSelection()?.removeAllRanges();
    setSelection(null);
  }, [selection, currentPage, addQuote]);

  const handleAddNote = useCallback(
    async (content: string) => {
      if (!selection) return;
      await addNote(currentPage, content, selection.text);
      window.getSelection()?.removeAllRanges();
      setSelection(null);
    },
    [selection, currentPage, addNote]
  );

  const progressPercent = numPages > 0 ? Math.round((currentPage / numPages) * 100) : 0;
  const pageHighlights = getHighlightsForPage(currentPage);

  const modeIcons: Record<ReadingMode, typeof Sun> = {
    light: Sun,
    sepia: Coffee,
    dark: Moon,
  };

  if (!isReaderOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-background"
      onMouseMove={handleMouseMove}
    >
      {/* Top Toolbar */}
      <div
        className={cn(
          'reader-toolbar fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-b shadow-soft px-4 py-2 transition-opacity duration-200',
          !showToolbar && 'opacity-0 pointer-events-none'
        )}
      >
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          {/* Left: Close & Title */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={closeReader}>
              <X className="w-5 h-5" />
            </Button>
            <h2 className="font-medium text-foreground truncate max-w-[200px] sm:max-w-[300px]">
              {currentDocument?.title}
            </h2>
          </div>

          {/* Center: Page Navigation */}
          <div className="hidden sm:flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <span className="text-sm text-muted-foreground min-w-[100px] text-center">
              Page {currentPage} of {numPages}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
              disabled={currentPage >= numPages}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-1">
            {/* Reading Mode Toggle */}
            <div className="flex items-center border rounded-full p-1 gap-0.5">
              {(['light', 'sepia', 'dark'] as ReadingMode[]).map((m) => {
                const Icon = modeIcons[m];
                return (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
                      mode === m
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                );
              })}
            </div>

            {/* Zoom Controls */}
            <div className="hidden md:flex items-center gap-1 ml-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setScale((s) => Math.max(0.5, s - 0.1));
                  setFitMode('custom');
                }}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground min-w-[50px] text-center">
                {Math.round(scale * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setScale((s) => Math.min(2, s + 0.1));
                  setFitMode('custom');
                }}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="fixed top-[57px] left-0 right-0 z-40 h-1 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* PDF Container */}
      <div
        ref={containerRef}
        className="h-full pt-16 pb-20 overflow-auto custom-scrollbar"
      >
        <div className="flex justify-center py-8 px-4 min-h-full">
          {pdfData && (
            <Document
              file={{ data: pdfData }}
              onLoadSuccess={({ numPages }) => setNumPages(numPages)}
              loading={
                <div className="flex items-center justify-center h-[600px]">
                  <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              }
            >
              <div ref={pageRef} className="pdf-page relative">
                <Page
                  pageNumber={currentPage}
                  scale={fitMode === 'width' ? containerWidth / 612 : scale}
                  className="page-turn"
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                />
                <PageHighlights highlights={pageHighlights} />
              </div>
            </Document>
          )}
        </div>
      </div>

      {/* Bottom Navigation (Mobile) */}
      <div
        className={cn(
          'reader-toolbar fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-t shadow-soft px-4 py-3 sm:hidden transition-opacity duration-200',
          !showToolbar && 'opacity-0 pointer-events-none'
        )}
      >
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <div className="flex flex-col items-center">
            <span className="text-sm font-medium">
              {currentPage} / {numPages}
            </span>
            <span className="text-xs text-muted-foreground">{progressPercent}%</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
            disabled={currentPage >= numPages}
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
        </div>
      </div>

      {/* Selection Toolbar */}
      {selection && (
        <SelectionToolbar
          position={selection.position}
          onHighlight={handleHighlight}
          onSaveQuote={handleSaveQuote}
          onAddNote={handleAddNote}
          onClose={() => setSelection(null)}
        />
      )}
    </div>
  );
}
