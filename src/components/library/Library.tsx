import { BookOpen, Upload } from 'lucide-react';
import { type ChangeEvent, useCallback, useRef } from 'react';
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

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files?.length) return;

      for (const file of files) {
        if (file.type === 'application/pdf') {
          await uploadDocument(file);
        }
      }

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [uploadDocument]
  );

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
