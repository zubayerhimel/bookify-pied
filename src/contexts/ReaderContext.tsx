import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { PDFDocument } from '@/lib/db/types';

interface ReaderContextType {
  currentDocument: PDFDocument | null;
  isReaderOpen: boolean;
  openReader: (doc: PDFDocument) => void;
  closeReader: () => void;
}

const ReaderContext = createContext<ReaderContextType | undefined>(undefined);

export function ReaderProvider({ children }: { children: ReactNode }) {
  const [currentDocument, setCurrentDocument] = useState<PDFDocument | null>(null);
  const [isReaderOpen, setIsReaderOpen] = useState(false);

  const openReader = useCallback((doc: PDFDocument) => {
    setCurrentDocument(doc);
    setIsReaderOpen(true);
  }, []);

  const closeReader = useCallback(() => {
    setIsReaderOpen(false);
    // Delay clearing document to allow exit animation
    setTimeout(() => setCurrentDocument(null), 300);
  }, []);

  return (
    <ReaderContext.Provider
      value={{
        currentDocument,
        isReaderOpen,
        openReader,
        closeReader,
      }}
    >
      {children}
    </ReaderContext.Provider>
  );
}

export function useReader() {
  const context = useContext(ReaderContext);
  if (context === undefined) {
    throw new Error('useReader must be used within a ReaderProvider');
  }
  return context;
}
