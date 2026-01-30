import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { pdfjs } from 'react-pdf';
import { PDFDocument } from '@/lib/db/types';
import {
  getAllDocuments,
  saveDocument,
  saveFile,
  deleteDocument as dbDeleteDocument,
  getDocument,
} from '@/lib/db/database';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export function useLibrary() {
  const [documents, setDocuments] = useState<PDFDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const docs = await getAllDocuments();
      setDocuments(docs);
      setError(null);
    } catch (err) {
      setError('Failed to load library');
      console.error('Error loading documents:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const generateThumbnail = async (pdfData: ArrayBuffer): Promise<string> => {
    try {
      const pdf = await pdfjs.getDocument({ data: pdfData }).promise;
      const page = await pdf.getPage(1);
      
      const scale = 0.5;
      const viewport = page.getViewport({ scale });
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) throw new Error('Could not get canvas context');
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      await page.render({
        canvasContext: context,
        viewport,
      }).promise;
      
      return canvas.toDataURL('image/jpeg', 0.7);
    } catch (err) {
      console.error('Error generating thumbnail:', err);
      return '';
    }
  };

  const uploadDocument = useCallback(async (file: File): Promise<PDFDocument | null> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      const totalPages = pdf.numPages;
      
      const thumbnail = await generateThumbnail(arrayBuffer);
      
      const id = uuidv4();
      const now = new Date();
      
      const doc: PDFDocument = {
        id,
        title: file.name.replace(/\.pdf$/i, ''),
        fileName: file.name,
        fileSize: file.size,
        totalPages,
        currentPage: 1,
        scrollPosition: 0,
        lastOpened: now,
        createdAt: now,
        coverThumbnail: thumbnail,
      };
      
      // Save document metadata and file separately
      await saveDocument(doc);
      await saveFile({ id, data: arrayBuffer });
      
      setDocuments(prev => [doc, ...prev]);
      return doc;
    } catch (err) {
      console.error('Error uploading document:', err);
      setError('Failed to upload PDF');
      return null;
    }
  }, []);

  const renameDocument = useCallback(async (id: string, newTitle: string): Promise<void> => {
    try {
      const doc = await getDocument(id);
      if (doc) {
        doc.title = newTitle;
        await saveDocument(doc);
        setDocuments(prev => prev.map(d => d.id === id ? { ...d, title: newTitle } : d));
      }
    } catch (err) {
      console.error('Error renaming document:', err);
      setError('Failed to rename document');
    }
  }, []);

  const deleteDocumentById = useCallback(async (id: string): Promise<void> => {
    try {
      await dbDeleteDocument(id);
      setDocuments(prev => prev.filter(d => d.id !== id));
    } catch (err) {
      console.error('Error deleting document:', err);
      setError('Failed to delete document');
    }
  }, []);

  const refreshDocument = useCallback(async (id: string): Promise<void> => {
    const doc = await getDocument(id);
    if (doc) {
      setDocuments(prev => prev.map(d => d.id === id ? doc : d));
    }
  }, []);

  return {
    documents,
    loading,
    error,
    uploadDocument,
    renameDocument,
    deleteDocument: deleteDocumentById,
    refreshDocument,
    refresh: loadDocuments,
  };
}
