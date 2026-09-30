import { decodePDFRawStream, PDFArray, PDFDict, PDFHexString, PDFName, PDFRawStream, PDFString, PDFDocument as PdfLibDocument } from "pdf-lib";
import { v4 as uuidv4 } from "uuid";
import { getBookmarksByPdf, getDocument, getFile, getHighlightsByPdf, getNotesByPdf, getQuotesByPdf, saveBookmark, saveHighlight, saveNote, saveQuote } from "@/lib/db/database";
import type { Bookmark, Highlight, Note, Quote } from "@/lib/db/types";

// A copy of every annotation is embedded in the exported PDF under this name,
// so re-uploading the file restores highlights, notes, quotes, and bookmarks.
const ATTACHMENT_NAME = "pdfhaven-annotations.json";
const BUNDLE_APP = "pdf-haven";
const BUNDLE_VERSION = 1;

export interface AnnotationBundle {
  app: string;
  version: number;
  exportedAt: string;
  document: { title: string; currentPage: number; totalPages: number };
  highlights: Highlight[];
  quotes: Quote[];
  notes: Note[];
  bookmarks: Bookmark[];
}

export interface AnnotationCounts {
  highlights: number;
  quotes: number;
  notes: number;
  bookmarks: number;
}

export function totalAnnotations(counts: AnnotationCounts): number {
  return counts.highlights + counts.quotes + counts.notes + counts.bookmarks;
}

function sanitizeFileName(title: string): string {
  const cleaned = title.replace(/[\\/:*?"<>|]+/g, "_").trim() || "document";
  return cleaned.toLowerCase().endsWith(".pdf") ? cleaned : `${cleaned}.pdf`;
}

async function toUint8Array(data: Blob | ArrayBuffer): Promise<Uint8Array> {
  if (data instanceof Blob) return new Uint8Array(await data.arrayBuffer());
  return new Uint8Array(data);
}

/** Build a PDF that carries the document's annotations as an embedded attachment. */
export async function buildAnnotatedPdf(pdfId: string): Promise<{
  blob: Blob;
  fileName: string;
  counts: AnnotationCounts;
}> {
  const [doc, file, highlights, quotes, notes, bookmarks] = await Promise.all([
    getDocument(pdfId),
    getFile(pdfId),
    getHighlightsByPdf(pdfId),
    getQuotesByPdf(pdfId),
    getNotesByPdf(pdfId),
    getBookmarksByPdf(pdfId),
  ]);

  if (!doc || !file) {
    throw new Error("This document could not be found.");
  }

  const bundle: AnnotationBundle = {
    app: BUNDLE_APP,
    version: BUNDLE_VERSION,
    exportedAt: new Date().toISOString(),
    document: {
      title: doc.title,
      currentPage: doc.currentPage,
      totalPages: doc.totalPages,
    },
    highlights,
    quotes,
    notes,
    bookmarks,
  };

  const pdfBytes = await toUint8Array(file.data);
  const pdfDoc = await PdfLibDocument.load(pdfBytes, {
    ignoreEncryption: true,
  });
  pdfDoc.attach(new TextEncoder().encode(JSON.stringify(bundle)), ATTACHMENT_NAME, {
    mimeType: "application/json",
    description: "PDF Haven highlights, notes, quotes, and bookmarks",
    creationDate: new Date(),
    modificationDate: new Date(),
  });

  const out = await pdfDoc.save();
  const blob = new Blob([out as BlobPart], { type: "application/pdf" });

  return {
    blob,
    fileName: sanitizeFileName(doc.title),
    counts: {
      highlights: highlights.length,
      quotes: quotes.length,
      notes: notes.length,
      bookmarks: bookmarks.length,
    },
  };
}

export function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function decodeAttachmentName(obj: unknown): string | undefined {
  if (obj instanceof PDFString || obj instanceof PDFHexString) {
    return obj.decodeText();
  }
  return undefined;
}

function readEmbeddedFileStream(ef: PDFDict): PDFRawStream | null {
  const f = ef.lookup(PDFName.of("F"));
  if (f instanceof PDFRawStream) return f;
  const uf = ef.lookup(PDFName.of("UF"));
  if (uf instanceof PDFRawStream) return uf;
  return null;
}

// Walk a PDF name tree (which may nest under Kids) for our attachment stream.
function findAttachmentStream(node: unknown, target: string): Uint8Array | null {
  if (!(node instanceof PDFDict)) return null;

  const kids = node.lookup(PDFName.of("Kids"));
  if (kids instanceof PDFArray) {
    for (let i = 0; i < kids.size(); i += 1) {
      const found = findAttachmentStream(kids.lookup(i), target);
      if (found) return found;
    }
  }

  const names = node.lookup(PDFName.of("Names"));
  if (names instanceof PDFArray) {
    for (let i = 0; i < names.size(); i += 2) {
      if (decodeAttachmentName(names.lookup(i)) !== target) continue;
      const spec = names.lookup(i + 1);
      if (!(spec instanceof PDFDict)) continue;
      const ef = spec.lookup(PDFName.of("EF"));
      if (!(ef instanceof PDFDict)) continue;
      const stream = readEmbeddedFileStream(ef);
      if (stream) return decodePDFRawStream(stream).decode();
    }
  }

  return null;
}

/** Read back an annotation bundle embedded in a PDF file, if present. */
export async function extractAnnotationBundle(source: Blob | ArrayBuffer): Promise<AnnotationBundle | null> {
  try {
    const bytes = await toUint8Array(source);
    const pdfDoc = await PdfLibDocument.load(bytes, { ignoreEncryption: true });
    const namesDict = pdfDoc.catalog.lookup(PDFName.of("Names"));
    const efTree = namesDict instanceof PDFDict ? namesDict.lookup(PDFName.of("EmbeddedFiles")) : undefined;
    const content = findAttachmentStream(efTree, ATTACHMENT_NAME);
    if (!content) return null;

    const parsed = JSON.parse(new TextDecoder().decode(content)) as AnnotationBundle;
    if (parsed?.app !== BUNDLE_APP || !Array.isArray(parsed.highlights)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Save a bundle's annotations against a freshly imported document id. */
export async function restoreAnnotations(pdfId: string, bundle: AnnotationBundle): Promise<AnnotationCounts> {
  const highlights = bundle.highlights ?? [];
  const quotes = bundle.quotes ?? [];
  const notes = bundle.notes ?? [];
  const bookmarks = bundle.bookmarks ?? [];

  await Promise.all([
    ...highlights.map((h) =>
      saveHighlight({
        ...h,
        id: uuidv4(),
        pdfId,
        createdAt: new Date(h.createdAt),
      }),
    ),
    ...quotes.map((q) => saveQuote({ ...q, id: uuidv4(), pdfId, createdAt: new Date(q.createdAt) })),
    ...notes.map((n) =>
      saveNote({
        ...n,
        id: uuidv4(),
        pdfId,
        createdAt: new Date(n.createdAt),
        updatedAt: new Date(n.updatedAt),
      }),
    ),
    ...bookmarks.map((b) =>
      saveBookmark({
        ...b,
        id: uuidv4(),
        pdfId,
        createdAt: new Date(b.createdAt),
      }),
    ),
  ]);

  return {
    highlights: highlights.length,
    quotes: quotes.length,
    notes: notes.length,
    bookmarks: bookmarks.length,
  };
}
