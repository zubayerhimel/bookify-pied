import { openDB, DBSchema, IDBPDatabase } from 'idb';
import {
  PDFDocument,
  PDFFile,
  Highlight,
  Quote,
  Note,
  DB_NAME,
  DB_VERSION,
  STORE_NAMES,
} from './types';

interface ReaderDBSchema extends DBSchema {
  [STORE_NAMES.DOCUMENTS]: {
    key: string;
    value: PDFDocument;
    indexes: { 'by-lastOpened': Date };
  };
  [STORE_NAMES.FILES]: {
    key: string;
    value: PDFFile;
  };
  [STORE_NAMES.HIGHLIGHTS]: {
    key: string;
    value: Highlight;
    indexes: { 'by-pdfId': string; 'by-page': [string, number] };
  };
  [STORE_NAMES.QUOTES]: {
    key: string;
    value: Quote;
    indexes: { 'by-pdfId': string; 'by-date': Date };
  };
  [STORE_NAMES.NOTES]: {
    key: string;
    value: Note;
    indexes: { 'by-pdfId': string; 'by-date': Date };
  };
}

let dbInstance: IDBPDatabase<ReaderDBSchema> | null = null;

export async function getDB(): Promise<IDBPDatabase<ReaderDBSchema>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<ReaderDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Documents store
      if (!db.objectStoreNames.contains(STORE_NAMES.DOCUMENTS)) {
        const docStore = db.createObjectStore(STORE_NAMES.DOCUMENTS, { keyPath: 'id' });
        docStore.createIndex('by-lastOpened', 'lastOpened');
      }

      // Files store (separate for large binary data)
      if (!db.objectStoreNames.contains(STORE_NAMES.FILES)) {
        db.createObjectStore(STORE_NAMES.FILES, { keyPath: 'id' });
      }

      // Highlights store
      if (!db.objectStoreNames.contains(STORE_NAMES.HIGHLIGHTS)) {
        const highlightStore = db.createObjectStore(STORE_NAMES.HIGHLIGHTS, { keyPath: 'id' });
        highlightStore.createIndex('by-pdfId', 'pdfId');
        highlightStore.createIndex('by-page', ['pdfId', 'pageNumber']);
      }

      // Quotes store
      if (!db.objectStoreNames.contains(STORE_NAMES.QUOTES)) {
        const quoteStore = db.createObjectStore(STORE_NAMES.QUOTES, { keyPath: 'id' });
        quoteStore.createIndex('by-pdfId', 'pdfId');
        quoteStore.createIndex('by-date', 'createdAt');
      }

      // Notes store
      if (!db.objectStoreNames.contains(STORE_NAMES.NOTES)) {
        const noteStore = db.createObjectStore(STORE_NAMES.NOTES, { keyPath: 'id' });
        noteStore.createIndex('by-pdfId', 'pdfId');
        noteStore.createIndex('by-date', 'createdAt');
      }
    },
  });

  return dbInstance;
}

// Document operations
export async function saveDocument(doc: PDFDocument): Promise<void> {
  const db = await getDB();
  await db.put(STORE_NAMES.DOCUMENTS, doc);
}

export async function getDocument(id: string): Promise<PDFDocument | undefined> {
  const db = await getDB();
  return db.get(STORE_NAMES.DOCUMENTS, id);
}

export async function getAllDocuments(): Promise<PDFDocument[]> {
  const db = await getDB();
  const docs = await db.getAllFromIndex(STORE_NAMES.DOCUMENTS, 'by-lastOpened');
  return docs.reverse(); // Most recent first
}

export async function deleteDocument(id: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(
    [STORE_NAMES.DOCUMENTS, STORE_NAMES.FILES, STORE_NAMES.HIGHLIGHTS, STORE_NAMES.QUOTES, STORE_NAMES.NOTES],
    'readwrite'
  );

  // Delete document and file
  await tx.objectStore(STORE_NAMES.DOCUMENTS).delete(id);
  await tx.objectStore(STORE_NAMES.FILES).delete(id);

  // Delete associated highlights
  const highlightIndex = tx.objectStore(STORE_NAMES.HIGHLIGHTS).index('by-pdfId');
  let highlightCursor = await highlightIndex.openCursor(id);
  while (highlightCursor) {
    await highlightCursor.delete();
    highlightCursor = await highlightCursor.continue();
  }

  // Delete associated quotes
  const quoteIndex = tx.objectStore(STORE_NAMES.QUOTES).index('by-pdfId');
  let quoteCursor = await quoteIndex.openCursor(id);
  while (quoteCursor) {
    await quoteCursor.delete();
    quoteCursor = await quoteCursor.continue();
  }

  // Delete associated notes
  const noteIndex = tx.objectStore(STORE_NAMES.NOTES).index('by-pdfId');
  let noteCursor = await noteIndex.openCursor(id);
  while (noteCursor) {
    await noteCursor.delete();
    noteCursor = await noteCursor.continue();
  }

  await tx.done;
}

// File operations
export async function saveFile(file: PDFFile): Promise<void> {
  const db = await getDB();
  await db.put(STORE_NAMES.FILES, file);
}

export async function getFile(id: string): Promise<PDFFile | undefined> {
  const db = await getDB();
  return db.get(STORE_NAMES.FILES, id);
}

// Highlight operations
export async function saveHighlight(highlight: Highlight): Promise<void> {
  const db = await getDB();
  await db.put(STORE_NAMES.HIGHLIGHTS, highlight);
}

export async function getHighlightsByPdf(pdfId: string): Promise<Highlight[]> {
  const db = await getDB();
  return db.getAllFromIndex(STORE_NAMES.HIGHLIGHTS, 'by-pdfId', pdfId);
}

export async function getHighlightsByPage(pdfId: string, pageNumber: number): Promise<Highlight[]> {
  const db = await getDB();
  return db.getAllFromIndex(STORE_NAMES.HIGHLIGHTS, 'by-page', [pdfId, pageNumber]);
}

export async function deleteHighlight(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAMES.HIGHLIGHTS, id);
}

// Quote operations
export async function saveQuote(quote: Quote): Promise<void> {
  const db = await getDB();
  await db.put(STORE_NAMES.QUOTES, quote);
}

export async function getQuotesByPdf(pdfId: string): Promise<Quote[]> {
  const db = await getDB();
  return db.getAllFromIndex(STORE_NAMES.QUOTES, 'by-pdfId', pdfId);
}

export async function getAllQuotes(): Promise<Quote[]> {
  const db = await getDB();
  const quotes = await db.getAllFromIndex(STORE_NAMES.QUOTES, 'by-date');
  return quotes.reverse();
}

export async function deleteQuote(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAMES.QUOTES, id);
}

// Note operations
export async function saveNote(note: Note): Promise<void> {
  const db = await getDB();
  await db.put(STORE_NAMES.NOTES, note);
}

export async function getNotesByPdf(pdfId: string): Promise<Note[]> {
  const db = await getDB();
  return db.getAllFromIndex(STORE_NAMES.NOTES, 'by-pdfId', pdfId);
}

export async function getAllNotes(): Promise<Note[]> {
  const db = await getDB();
  const notes = await db.getAllFromIndex(STORE_NAMES.NOTES, 'by-date');
  return notes.reverse();
}

export async function deleteNote(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAMES.NOTES, id);
}

// Reading progress
export async function updateReadingProgress(
  pdfId: string,
  currentPage: number,
  scrollPosition: number
): Promise<void> {
  const db = await getDB();
  const doc = await db.get(STORE_NAMES.DOCUMENTS, pdfId);
  if (doc) {
    doc.currentPage = currentPage;
    doc.scrollPosition = scrollPosition;
    doc.lastOpened = new Date();
    await db.put(STORE_NAMES.DOCUMENTS, doc);
  }
}
