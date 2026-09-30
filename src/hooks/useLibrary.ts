import { useCallback, useEffect, useState } from "react";
import { pdfjs } from "react-pdf";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { extractAnnotationBundle, restoreAnnotations, totalAnnotations } from "@/lib/annotations-transfer";
import { deleteDocument as dbDeleteDocument, getAllDocuments, getDocument, saveDocument, saveDocumentWithFile } from "@/lib/db/database";
import type { PDFDocument } from "@/lib/db/types";
import "@/lib/pdf-worker";

export interface UploadProgress {
  fileName: string;
  percent: number;
  index: number;
  batchTotal: number;
}

// Stream the file so the progress bar reflects real bytes read; returns the
// full contents for pdf.js so the file is only read once.
async function readFileWithProgress(file: File, onProgress: (loaded: number) => void): Promise<Uint8Array> {
  const buffer = new Uint8Array(file.size);
  const reader = file.stream().getReader();
  let offset = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer.set(value, offset);
    offset += value.length;
    onProgress(offset);
  }
  return buffer;
}

export function useLibrary() {
  const [documents, setDocuments] = useState<PDFDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
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
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 0.5 });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return "";

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const renderTask = page.render({
      canvas,
      canvasContext: context,
      viewport,
    });
    // Swallow a late cancellation rejection so it never surfaces as unhandled.
    void renderTask.promise.catch(() => {});

    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        renderTask.promise,
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error("Thumbnail render timed out")), 8000);
        }),
      ]);
      return canvas.toDataURL("image/jpeg", 0.7);
    } catch (err) {
      console.error("Error generating thumbnail:", err);
      renderTask.cancel();
      return "";
    } finally {
      if (timer) clearTimeout(timer);
    }
  }, []);

  const uploadSingle = useCallback(
    async (file: File, index: number, batchTotal: number): Promise<PDFDocument | null> => {
      let loadingTask: ReturnType<typeof pdfjs.getDocument> | null = null;

      try {
        setError(null);
        setUploadProgress({ fileName: file.name, percent: 0, index, batchTotal });

        // Reading the file drives the bulk of the bar (0–90%); parsing and
        // saving finish it off. There is no network here, so this reflects the
        // real work of ingesting the PDF.
        const data = await readFileWithProgress(file, (loaded) => {
          const percent = file.size > 0 ? Math.round((loaded / file.size) * 90) : 90;
          setUploadProgress({ fileName: file.name, percent, index, batchTotal });
        });

        loadingTask = pdfjs.getDocument({ data });
        const pdf = await loadingTask.promise;
        const totalPages = pdf.numPages;
        setUploadProgress({ fileName: file.name, percent: 95, index, batchTotal });

        // Restore embedded annotations if this PDF was exported from the app.
        const bundle = await extractAnnotationBundle(file).catch(() => null);
        const resumePage = bundle?.document?.currentPage;

        const id = uuidv4();
        const now = new Date();

        const doc: PDFDocument = {
          id,
          title: file.name.replace(/\.pdf$/i, ""),
          fileName: file.name,
          fileSize: file.size,
          totalPages,
          currentPage: resumePage && resumePage >= 1 && resumePage <= totalPages ? resumePage : 1,
          scrollPosition: 0,
          lastOpened: now,
          createdAt: now,
        };

        // Persist first so a slow or failed cover render never blocks the import.
        await saveDocumentWithFile(doc, { id, data: file });
        setUploadProgress({ fileName: file.name, percent: 100, index, batchTotal });
        setDocuments((prev) => [doc, ...prev]);

        if (bundle) {
          try {
            const counts = await restoreAnnotations(id, bundle);
            const restored = totalAnnotations(counts);
            if (restored > 0) {
              toast.success(`Restored ${restored} ${restored === 1 ? "annotation" : "annotations"} from ${doc.title}`);
            }
          } catch (restoreErr) {
            console.error("Error restoring annotations:", restoreErr);
          }
        }

        // Render the cover off the critical path and fill it in when ready.
        const task = loadingTask;
        void generateThumbnail(pdf)
          .then(async (thumbnail) => {
            if (!thumbnail) return;
            const existing = await getDocument(id);
            if (!existing) return; // deleted before the cover finished
            await saveDocument({ ...existing, coverThumbnail: thumbnail });
            setDocuments((prev) => prev.map((d) => (d.id === id ? { ...d, coverThumbnail: thumbnail } : d)));
          })
          .catch((err) => console.error("Error generating thumbnail:", err))
          .finally(() => {
            task?.destroy();
          });

        return doc;
      } catch (err) {
        console.error("Error uploading document:", err);
        setError(err instanceof DOMException && err.name === "QuotaExceededError" ? "Not enough browser storage is available for this PDF." : "Failed to upload PDF.");
        loadingTask?.destroy();
        return null;
      }
    },
    [generateThumbnail],
  );

  const uploadDocument = useCallback(
    async (file: File): Promise<PDFDocument | null> => {
      setUploading(true);
      try {
        return await uploadSingle(file, 1, 1);
      } finally {
        setUploading(false);
        setUploadProgress(null);
      }
    },
    [uploadSingle],
  );

  const uploadDocuments = useCallback(
    async (files: File[]): Promise<void> => {
      if (files.length === 0) return;
      setUploading(true);
      try {
        for (let i = 0; i < files.length; i++) {
          await uploadSingle(files[i], i + 1, files.length);
        }
      } finally {
        setUploading(false);
        setUploadProgress(null);
      }
    },
    [uploadSingle],
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
    uploadProgress,
    error,
    uploadDocument,
    uploadDocuments,
    renameDocument,
    deleteDocument: deleteDocumentById,
    refreshDocument,
    refresh: loadDocuments,
  };
}
