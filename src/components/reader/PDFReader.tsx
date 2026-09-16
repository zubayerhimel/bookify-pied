import {
  ChevronLeft,
  ChevronRight,
  Coffee,
  ListTree,
  Minus,
  Moon,
  Plus,
  StickyNote,
  Sun,
  X,
} from 'lucide-react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Document, Page } from 'react-pdf';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAnnotations } from '@/hooks/useAnnotations';
import { type ReadingMode, useReadingMode } from '@/hooks/useReadingMode';
import { getFile, updateReadingProgress } from '@/lib/db/database';
import type { PDFDocument } from '@/lib/db/types';
import { cn } from '@/lib/utils';
import { NotesPanel } from './NotesPanel';
import { OutlineSidebar, type TocItem } from './OutlineSidebar';
import { PageHighlights } from './PageHighlights';
import { SelectionToolbar } from './SelectionToolbar';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import '@/lib/pdf-worker';

interface PDFReaderProps {
  document: PDFDocument;
  initialPage?: number;
  onClose: () => void;
}

// Resolve a pdf.js outline destination to a 1-based page number.
async function resolveOutlinePage(
  pdf: PDFDocumentProxy,
  dest: string | unknown[] | null
): Promise<number | null> {
  try {
    let explicit: unknown[] | null = null;
    if (typeof dest === 'string') {
      explicit = await pdf.getDestination(dest);
    } else if (Array.isArray(dest)) {
      explicit = dest;
    }
    const ref = explicit?.[0];
    if (!ref) return null;
    const pageIndex = await pdf.getPageIndex(
      ref as Parameters<PDFDocumentProxy['getPageIndex']>[0]
    );
    return pageIndex + 1;
  } catch {
    return null;
  }
}

type RawOutline = Awaited<ReturnType<PDFDocumentProxy['getOutline']>>;
type RawOutlineItem = RawOutline extends (infer T)[] ? T : never;

async function buildToc(
  pdf: PDFDocumentProxy,
  items: RawOutlineItem[]
): Promise<TocItem[]> {
  return Promise.all(
    items.map(async (item) => ({
      title: item.title,
      pageNumber: await resolveOutlinePage(pdf, item.dest),
      items: item.items?.length ? await buildToc(pdf, item.items) : [],
    }))
  );
}

export function PDFReader({
  document: doc,
  initialPage,
  onClose,
}: PDFReaderProps) {
  const { mode, setMode } = useReadingMode();
  const {
    notes,
    addHighlight,
    addQuote,
    addNote,
    updateNote,
    removeNote,
    getHighlightsForPage,
    getNotesForPage,
  } = useAnnotations(doc.id);

  const [pdfData, setPdfData] = useState<Blob | ArrayBuffer | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [scale, setScale] = useState(1);
  const [showToolbar, setShowToolbar] = useState(true);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [showNotesPanel, setShowNotesPanel] = useState(false);
  const [showOutline, setShowOutline] = useState(false);
  const [outline, setOutline] = useState<TocItem[]>([]);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const [readyRenderKey, setReadyRenderKey] = useState<string | null>(null);
  const [selection, setSelection] = useState<{
    text: string;
    rects: DOMRect[];
    position: { x: number; y: number };
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const toolbarTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );
  const skipPageCommitRef = useRef(false);
  const pageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPageInput(String(currentPage));
  }, [currentPage]);

  const commitPageInput = useCallback(
    (value: string) => {
      const requestedPage = Number.parseInt(value, 10);
      if (!Number.isFinite(requestedPage) || numPages < 1) {
        setPageInput(String(currentPage));
        return;
      }

      const nextPage = Math.min(numPages, Math.max(1, requestedPage));
      setCurrentPage(nextPage);
      setPageInput(String(nextPage));
    },
    [currentPage, numPages]
  );

  const handlePageInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        commitPageInput(event.currentTarget.value);
        event.currentTarget.blur();
      } else if (event.key === 'Escape') {
        skipPageCommitRef.current = true;
        setPageInput(String(currentPage));
        event.currentTarget.blur();
      }
    },
    [commitPageInput, currentPage]
  );

  const handlePageInputFocus = useCallback(() => {
    setShowToolbar(true);
    if (toolbarTimeoutRef.current) clearTimeout(toolbarTimeoutRef.current);
  }, []);

  // Load PDF file
  useEffect(() => {
    let cancelled = false;

    const loadPdf = async () => {
      const file = await getFile(doc.id);
      if (file && !cancelled) {
        setPdfData(file.data);
        setCurrentPage(initialPage ?? doc.currentPage ?? 1);
      }
    };

    loadPdf();

    return () => {
      cancelled = true;
      setPdfData(null);
    };
  }, [doc, initialPage]);

  // Measure before paint so the PDF never renders at a placeholder width.
  useLayoutEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const styles = getComputedStyle(containerRef.current);
        const horizontalPadding =
          Number.parseFloat(styles.paddingLeft) +
          Number.parseFloat(styles.paddingRight);
        const nextWidth = Math.max(
          280,
          containerRef.current.clientWidth - horizontalPadding - 32
        );
        setContainerWidth((width) => (width === nextWidth ? width : nextWidth));
      }
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const renderedPageWidth =
    containerWidth === null ? null : containerWidth * scale;
  const pageRenderKey = `${doc.id}-${currentPage}-${renderedPageWidth}`;
  const isPageReady = readyRenderKey === pageRenderKey;

  const handleDocumentLoad = useCallback(async (pdf: PDFDocumentProxy) => {
    setNumPages(pdf.numPages);
    try {
      const raw = await pdf.getOutline();
      setOutline(raw?.length ? await buildToc(pdf, raw) : []);
    } catch {
      setOutline([]);
    }
  }, []);

  const goToPage = useCallback(
    (page: number) => {
      const max = numPages || page;
      setCurrentPage(Math.max(1, Math.min(max, page)));
      if (window.matchMedia('(max-width: 1023px)').matches) {
        setShowOutline(false);
      }
    },
    [numPages]
  );

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

  const handlePageInputBlur = useCallback(
    (event: React.FocusEvent<HTMLInputElement>) => {
      if (skipPageCommitRef.current) {
        skipPageCommitRef.current = false;
      } else {
        commitPageInput(event.currentTarget.value);
      }
      handleMouseMove();
    },
    [commitPageInput, handleMouseMove]
  );

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  // Save reading progress
  useEffect(() => {
    const saveProgress = () => {
      updateReadingProgress(doc.id, currentPage, 0);
    };

    const debounced = setTimeout(saveProgress, 1000);
    return () => clearTimeout(debounced);
  }, [doc.id, currentPage]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target;
      if (
        target instanceof Element &&
        target.closest(
          'input, textarea, select, [contenteditable]:not([contenteditable="false"])'
        )
      ) {
        return;
      }

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
          if (showOutline) {
            setShowOutline(false);
            break;
          }
          onClose();
          break;
        case '+':
        case '=':
          setScale((s) => Math.min(2, s + 0.1));
          break;
        case '-':
          setScale((s) => Math.max(0.5, s - 0.1));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [numPages, onClose, showOutline]);

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

  const handleAddPageNote = useCallback(async () => {
    const content = noteContent.trim();
    if (!content) return;

    const note = await addNote(currentPage, content);
    if (note) {
      setNoteContent('');
      setShowNoteDialog(false);
    }
  }, [noteContent, currentPage, addNote]);

  const progressPercent =
    numPages > 0 ? Math.round((currentPage / numPages) * 100) : 0;
  const pageHighlights = getHighlightsForPage(currentPage);
  const currentPageNoteCount = getNotesForPage(currentPage).length;
  const totalNoteCount = notes.length;

  const modeIcons: Record<ReadingMode, typeof Sun> = {
    light: Sun,
    sepia: Coffee,
    dark: Moon,
  };

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Top Toolbar */}
      <div
        className={cn(
          'reader-toolbar fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-b shadow-soft px-4 py-2 transition-opacity duration-200',
          showOutline && 'lg:left-80',
          showNotesPanel && 'lg:right-96',
          !showToolbar && 'opacity-0 pointer-events-none'
        )}
      >
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          {/* Left: Close & Title */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Back to library"
            >
              <X className="w-5 h-5" />
            </Button>{' '}
            {outline.length > 0 && (
              <Button
                variant={showOutline ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setShowOutline((open) => !open)}
                aria-label={showOutline ? 'Hide contents' : 'Show contents'}
                aria-pressed={showOutline}
                title="Table of contents"
              >
                <ListTree className="w-5 h-5" />
              </Button>
            )}{' '}
            <h2 className="font-medium text-foreground truncate max-w-50 sm:max-w-75">
              {doc.title}
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
            <div className="flex min-w-29.5 items-center justify-center gap-1.5 text-sm text-muted-foreground">
              <span>Page</span>
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={numPages || 1}
                value={pageInput}
                onChange={(event) => setPageInput(event.target.value)}
                onFocus={handlePageInputFocus}
                onBlur={handlePageInputBlur}
                onKeyDown={handlePageInputKeyDown}
                aria-label="Page number"
                disabled={numPages < 1}
                className="h-8 w-14 px-1.5 text-center text-sm"
              />
              <span>of {numPages}</span>
            </div>
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
            <Button
              variant={showNotesPanel ? 'secondary' : 'ghost'}
              size="sm"
              className="gap-2 relative"
              onClick={() => setShowNotesPanel((open) => !open)}
              aria-label={
                showNotesPanel ? 'Hide notes panel' : 'Show notes panel'
              }
              aria-pressed={showNotesPanel}
              title={showNotesPanel ? 'Hide notes' : 'Show notes'}
            >
              <span className="relative flex">
                <StickyNote className="w-4 h-4" />
                {currentPageNoteCount > 0 && (
                  <span
                    className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary"
                    aria-hidden="true"
                  />
                )}
              </span>
              <span className="hidden sm:inline">Notes</span>
              {totalNoteCount > 0 && (
                <span className="hidden sm:inline text-xs text-muted-foreground">
                  {currentPageNoteCount > 0
                    ? `${currentPageNoteCount} on page`
                    : `${totalNoteCount} total`}
                </span>
              )}
            </Button>

            {/* Reading Mode Toggle */}
            <div className="flex items-center border rounded-full p-1 gap-0.5">
              {(['light', 'sepia', 'dark'] as ReadingMode[]).map((m) => {
                const Icon = modeIcons[m];
                return (
                  <button
                    type="button"
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
                }}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground min-w-12.5 text-center">
                {Math.round(scale * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setScale((s) => Math.min(2, s + 0.1));
                }}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div
        className={cn(
          'fixed top-14.25 left-0 right-0 z-40 h-1 bg-muted transition-[left,right] duration-300',
          showOutline && 'lg:left-80',
          showNotesPanel && 'lg:right-96'
        )}
      >
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* PDF Container */}
      <div
        ref={containerRef}
        className={cn(
          'h-full pt-16 pb-20 overflow-x-auto overflow-y-scroll custom-scrollbar',
          showOutline && 'lg:pl-80',
          showNotesPanel && 'lg:pr-96'
        )}
      >
        <div className="relative flex justify-center py-8 px-4 min-h-full">
          {pdfData && renderedPageWidth !== null && (
            <Document
              file={pdfData}
              onLoadSuccess={handleDocumentLoad}
              loading={null}
            >
              <div
                ref={pageRef}
                className={cn(
                  'pdf-page relative',
                  isPageReady ? 'opacity-100' : 'opacity-0'
                )}
              >
                <Page
                  key={pageRenderKey}
                  pageNumber={currentPage}
                  width={renderedPageWidth}
                  loading={null}
                  onRenderSuccess={() => setReadyRenderKey(pageRenderKey)}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                />
                <PageHighlights highlights={pageHighlights} />
              </div>
            </Document>
          )}
          {!isPageReady && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              role="status"
              aria-label="Loading PDF page"
            >
              <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation (Mobile) */}
      <div
        className={cn(
          'reader-toolbar fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-t shadow-soft px-4 py-3 sm:hidden transition-opacity duration-200',
          !showToolbar && 'opacity-0 pointer-events-none',
          showNotesPanel && 'hidden'
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
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                max={numPages || 1}
                value={pageInput}
                onChange={(event) => setPageInput(event.target.value)}
                onFocus={handlePageInputFocus}
                onBlur={handlePageInputBlur}
                onKeyDown={handlePageInputKeyDown}
                aria-label="Page number"
                disabled={numPages < 1}
                className="h-8 w-14 px-1.5 text-center text-sm"
              />
              <span>/ {numPages}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {progressPercent}%
            </span>
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

      <OutlineSidebar
        open={showOutline}
        outline={outline}
        currentPage={currentPage}
        onClose={() => setShowOutline(false)}
        onNavigate={goToPage}
      />

      <NotesPanel
        open={showNotesPanel}
        currentPage={currentPage}
        notes={notes}
        onClose={() => setShowNotesPanel(false)}
        onAddNote={() => setShowNoteDialog(true)}
        onJumpToPage={(page) => goToPage(page)}
        onUpdateNote={updateNote}
        onDeleteNote={removeNote}
      />

      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add note</DialogTitle>
            <DialogDescription>
              Save a note for page {currentPage} of {doc.title}.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={noteContent}
            onChange={(event) => setNoteContent(event.target.value)}
            placeholder="Write your note..."
            className="min-h-32 resize-none"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNoteDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddPageNote} disabled={!noteContent.trim()}>
              Save Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
