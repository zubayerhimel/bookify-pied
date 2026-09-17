import { BookOpen, Upload } from 'lucide-react';
import {
  type ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useLibrary } from '@/hooks/useLibrary';
import type { PDFDocument } from '@/lib/db/types';
import { LibraryCard } from './LibraryCard';
import { LibraryEmptyState } from './LibraryEmptyState';

export function Library() {
  const {
    documents,
    loading,
    uploading,
    error,
    uploadDocument,
    renameDocument,
    deleteDocument,
  } = useLibrary();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragDepth = useRef(0);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      const pdfs = Array.from(files).filter(
        (file) =>
          file.type === 'application/pdf' ||
          file.name.toLowerCase().endsWith('.pdf')
      );
      for (const file of pdfs) {
        await uploadDocument(file);
      }
    },
    [uploadDocument]
  );

  const handleFileChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files?.length) return;
      await processFiles(files);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [processFiles]
  );

  // Accept PDFs dropped anywhere on the page.
  useEffect(() => {
    const hasFiles = (e: DragEvent) =>
      !!e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files');

    const onDragEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepth.current += 1;
      setIsDragging(true);
    };
    const onDragOver = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    };
    const onDragLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      dragDepth.current -= 1;
      if (dragDepth.current <= 0) {
        dragDepth.current = 0;
        setIsDragging(false);
      }
    };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      dragDepth.current = 0;
      setIsDragging(false);
      if (e.dataTransfer?.files?.length) {
        void processFiles(e.dataTransfer.files);
      }
    };

    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, [processFiles]);

  const handleOpenDocument = useCallback(
    (doc: PDFDocument) => {
      navigate(`/read/${doc.id}`);
    },
    [navigate]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading your library...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {isDragging && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-background/80 p-6 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-primary/50 bg-card px-10 py-12 text-center shadow-book">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="font-reading text-xl font-semibold text-foreground">
                Drop your PDFs here
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Release to add them to your library
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary/10 rounded-xl">
            <BookOpen className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="font-reading text-3xl sm:text-4xl font-semibold text-foreground tracking-tight">
              My Library
            </h1>
            <p className="text-sm text-muted-foreground">
              {documents.length} {documents.length === 1 ? 'book' : 'books'}
            </p>
          </div>
        </div>

        <Button
          onClick={handleUploadClick}
          disabled={uploading}
          className="gap-2 shadow-soft hover:shadow-medium transition-shadow"
          size="lg"
        >
          <Upload className={uploading ? 'w-4 h-4 animate-pulse' : 'w-4 h-4'} />
          {uploading ? 'Adding PDF...' : 'Upload PDF'}
        </Button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {error && (
        <p role="alert" className="mb-6 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Library Grid or Empty State */}
      {documents.length === 0 ? (
        <LibraryEmptyState onUploadClick={handleUploadClick} />
      ) : (
        <div className="library-grid">
          {documents.map((doc) => (
            <div key={doc.id}>
              <LibraryCard
                document={doc}
                onOpen={handleOpenDocument}
                onRename={renameDocument}
                onDelete={deleteDocument}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
