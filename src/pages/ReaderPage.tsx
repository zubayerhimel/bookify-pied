import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { PDFReader } from '@/components/reader/PDFReader';
import { Button } from '@/components/ui/button';
import { getDocument } from '@/lib/db/database';
import type { PDFDocument } from '@/lib/db/types';

const ReaderPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [document, setDocument] = useState<PDFDocument | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing'>(
    'loading'
  );

  const pageParam = Number.parseInt(searchParams.get('page') ?? '', 10);
  const [initialPage] = useState(() =>
    Number.isFinite(pageParam) && pageParam > 0 ? pageParam : undefined
  );

  // The page param is only a one-time jump target; drop it so a refresh resumes saved progress.
  useEffect(() => {
    if (searchParams.has('page')) {
      const next = new URLSearchParams(searchParams);
      next.delete('page');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    getDocument(id)
      .then((doc) => {
        if (cancelled) return;
        if (doc) {
          setDocument(doc);
          setStatus('ready');
        } else {
          setStatus('missing');
        }
      })
      .catch((err) => {
        console.error('Error loading document:', err);
        if (!cancelled) setStatus('missing');
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleClose = useCallback(() => {
    navigate('/');
  }, [navigate]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground">Opening PDF...</p>
        </div>
      </div>
    );
  }

  if (!id || status === 'missing' || !document) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-xl text-center">
        <h1 className="text-2xl font-semibold text-foreground mb-2">
          PDF not found
        </h1>
        <p className="text-muted-foreground mb-6">
          This document is no longer in your library.
        </p>
        <Button onClick={handleClose}>Back to library</Button>
      </div>
    );
  }

  return (
    <PDFReader
      document={document}
      initialPage={initialPage}
      onClose={handleClose}
    />
  );
};

export default ReaderPage;
