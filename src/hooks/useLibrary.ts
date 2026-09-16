import { useCallback, useEffect, useState } from "react";
import { pdfjs } from "react-pdf";
import { v4 as uuidv4 } from "uuid";
import { deleteDocument as dbDeleteDocument, getAllDocuments, getDocument, saveDocument, saveDocumentWithFile } from "@/lib/db/database";
import type { PDFDocument } from "@/lib/db/types";
import "@/lib/pdf-worker";

export function useLibrary() {
  const [documents, setDocuments] = useState<PDFDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const docs = await getAllDocuments();
      setDocuments(docs);
      setError(null);
    } catch (err) {
      setError("Failed to load library");
      console.error("Error loading documents:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const generateThumbnail = useCallback(async (pdf: Awaited<ReturnType<typeof pdfjs.getDocument>["promise"]>): Promise<string> => {
    try {
      const page = await pdf.getPage(1);

      const scale = 0.5;
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) throw new Error("Could not get canvas context");

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({
        canvas,
        canvasContext: context,
        viewport,
      }).promise;

      return canvas.toDataURL("image/jpeg", 0.7);
    } catch (err) {
      console.error("Error generating thumbnail:", err);
      return "";
    }
  }, []);

  const uploadDocument = useCallback(
    async (file: File): Promise<PDFDocument | null> => {
      const objectUrl = URL.createObjectURL(file);
      let loadingTask: ReturnType<typeof pdfjs.getDocument> | null = null;

      try {
        setUploading(true);
        setError(null);
        loadingTask = pdfjs.getDocument({ url: objectUrl });
        const pdf = await loadingTask.promise;
        const totalPages = pdf.numPages;
        const thumbnail = await generateThumbnail(pdf);

        const id = uuidv4();
        const now = new Date();

        const doc: PDFDocument = {
          id,
          title: file.name.replace(/\.pdf$/i, ""),
          fileName: file.name,
          fileSize: file.size,
          totalPages,
          currentPage: 1,
          scrollPosition: 0,
          lastOpened: now,
          createdAt: now,
          coverThumbnail: thumbnail,
        };

        await saveDocumentWithFile(doc, { id, data: file });

        setDocuments((prev) => [doc, ...prev]);
        return doc;
      } catch (err) {
        console.error("Error uploading document:", err);
        setError(err instanceof DOMException && err.name === "QuotaExceededError" ? "Not enough browser storage is available for this PDF." : "Failed to upload PDF.");
        return null;
      } finally {
        try {
          await loadingTask?.destroy();
        } finally {
          URL.revokeObjectURL(objectUrl);
          setUploading(false);
        }
      }
    },
    [generateThumbnail],
  );

  const renameDocument = useCallback(async (id: string, newTitle: string): Promise<void> => {
    try {
      const doc = await getDocument(id);
      if (doc) {
        doc.title = newTitle;
        await saveDocument(doc);
        setDocuments((prev) => prev.map((d) => (d.id === id ? { ...d, title: newTitle } : d)));
      }
    } catch (err) {
      console.error("Error renaming document:", err);
      setError("Failed to rename document");
    }
  }, []);

  const deleteDocumentById = useCallback(async (id: string): Promise<void> => {
    try {
      await dbDeleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      console.error("Error deleting document:", err);
      setError("Failed to delete document");
    }
  }, []);

  const refreshDocument = useCallback(async (id: string): Promise<void> => {
    const doc = await getDocument(id);
    if (doc) {
      setDocuments((prev) => prev.map((d) => (d.id === id ? doc : d)));
    }
  }, []);

  return {
    documents,
    loading,
    uploading,
    error,
    uploadDocument,
    renameDocument,
    deleteDocument: deleteDocumentById,
    refreshDocument,
    refresh: loadDocuments,
  };
}
