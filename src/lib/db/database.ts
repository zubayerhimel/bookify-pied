import { openDB, IDBPDatabase } from 'idb';
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

let dbInstance: IDBPDatabase | null = null;

export async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance;

  try {
    dbInstance = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Documents store
        if (!db.objectStoreNames.contains(STORE_NAMES.DOCUMENTS)) {
          db.createObjectStore(STORE_NAMES.DOCUMENTS, { keyPath: 'id' });
        }

        // Files store (separate for large binary data)
        if (!db.objectStoreNames.contains(STORE_NAMES.FILES)) {
          db.createObjectStore(STORE_NAMES.FILES, { keyPath: 'id' });
        }

        // Highlights store
        if (!db.objectStoreNames.contains(STORE_NAMES.HIGHLIGHTS)) {
          db.createObjectStore(STORE_NAMES.HIGHLIGHTS, { keyPath: 'id' });
        }

        // Quotes store
        if (!db.objectStoreNames.contains(STORE_NAMES.QUOTES)) {
          db.createObjectStore(STORE_NAMES.QUOTES, { keyPath: 'id' });
        }

        // Notes store
        if (!db.objectStoreNames.contains(STORE_NAMES.NOTES)) {
          db.createObjectStore(STORE_NAMES.NOTES, { keyPath: 'id' });
        }
      },
    });

    return dbInstance;
  } catch (err) {
    console.error('Failed to open database:', err);
    throw err;
  }
}

// Document operations
export async function saveDocument(doc: PDFDocument): Promise<void> {
  const db = await getDB();
  // Convert dates to ISO strings for storage
  const storable = {
    ...doc,
    lastOpened: doc.lastOpened instanceof Date ? doc.lastOpened.toISOString() : doc.lastOpened,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
  };
  await db.put(STORE_NAMES.DOCUMENTS, storable);
}

export async function saveDocumentWithFile(doc: PDFDocument, file: PDFFile): Promise<void> {
  const db = await getDB();
  const storable = {
    ...doc,
    lastOpened: doc.lastOpened instanceof Date ? doc.lastOpened.toISOString() : doc.lastOpened,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : doc.createdAt,
  };
  const transaction = db.transaction(
    [STORE_NAMES.DOCUMENTS, STORE_NAMES.FILES],
    'readwrite'
  );

  await Promise.all([
    transaction.objectStore(STORE_NAMES.DOCUMENTS).put(storable),
    transaction.objectStore(STORE_NAMES.FILES).put(file),
    transaction.done,
  ]);
}

export async function getDocument(id: string): Promise<PDFDocument | undefined> {
  const db = await getDB();
  const doc = await db.get(STORE_NAMES.DOCUMENTS, id);
  if (doc) {
    return {
      ...doc,
      lastOpened: new Date(doc.lastOpened),
      createdAt: new Date(doc.createdAt),
    };
  }
  return undefined;
}

export async function getAllDocuments(): Promise<PDFDocument[]> {
  const db = await getDB();
  const docs = await db.getAll(STORE_NAMES.DOCUMENTS);
  // Convert dates and sort by lastOpened
  return docs
    .map((doc) => ({
      ...doc,
      lastOpened: new Date(doc.lastOpened),
      createdAt: new Date(doc.createdAt),
    }))
    .sort((a, b) => b.lastOpened.getTime() - a.lastOpened.getTime());
}

export async function deleteDocument(id: string): Promise<void> {
  const db = await getDB();
  
  // Delete document and file
  await db.delete(STORE_NAMES.DOCUMENTS, id);
  await db.delete(STORE_NAMES.FILES, id);

  // Delete associated highlights
  const highlights = await db.getAll(STORE_NAMES.HIGHLIGHTS);
  for (const h of highlights) {
    if (h.pdfId === id) {
      await db.delete(STORE_NAMES.HIGHLIGHTS, h.id);
    }
  }

  // Delete associated quotes
  const quotes = await db.getAll(STORE_NAMES.QUOTES);
  for (const q of quotes) {
    if (q.pdfId === id) {
      await db.delete(STORE_NAMES.QUOTES, q.id);
    }
  }

  // Delete associated notes
  const notes = await db.getAll(STORE_NAMES.NOTES);
  for (const n of notes) {
    if (n.pdfId === id) {
      await db.delete(STORE_NAMES.NOTES, n.id);
    }
  }
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
  const storable = {
    ...highlight,
    createdAt: highlight.createdAt instanceof Date ? highlight.createdAt.toISOString() : highlight.createdAt,
  };
  await db.put(STORE_NAMES.HIGHLIGHTS, storable);
}

export async function getHighlightsByPdf(pdfId: string): Promise<Highlight[]> {
  const db = await getDB();
  const all = await db.getAll(STORE_NAMES.HIGHLIGHTS);
  return all
    .filter((h) => h.pdfId === pdfId)
    .map((h) => ({
      ...h,
      createdAt: new Date(h.createdAt),
    }));
}

export async function getHighlightsByPage(pdfId: string, pageNumber: number): Promise<Highlight[]> {
  const highlights = await getHighlightsByPdf(pdfId);
  return highlights.filter((h) => h.pageNumber === pageNumber);
}

export async function deleteHighlight(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAMES.HIGHLIGHTS, id);
}

// Quote operations
export async function saveQuote(quote: Quote): Promise<void> {
  const db = await getDB();
  const storable = {
    ...quote,
    createdAt: quote.createdAt instanceof Date ? quote.createdAt.toISOString() : quote.createdAt,
  };
  await db.put(STORE_NAMES.QUOTES, storable);
}

export async function getQuotesByPdf(pdfId: string): Promise<Quote[]> {
  const db = await getDB();
  const all = await db.getAll(STORE_NAMES.QUOTES);
  return all
    .filter((q) => q.pdfId === pdfId)
    .map((q) => ({
      ...q,
      createdAt: new Date(q.createdAt),
    }));
}

export async function getAllQuotes(): Promise<Quote[]> {
  const db = await getDB();
  const all = await db.getAll(STORE_NAMES.QUOTES);
  return all
    .map((q) => ({
      ...q,
      createdAt: new Date(q.createdAt),
    }))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function deleteQuote(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAMES.QUOTES, id);
}

// Note operations
export async function saveNote(note: Note): Promise<void> {
  const db = await getDB();
  const storable = {
    ...note,
    createdAt: note.createdAt instanceof Date ? note.createdAt.toISOString() : note.createdAt,
    updatedAt: note.updatedAt instanceof Date ? note.updatedAt.toISOString() : note.updatedAt,
  };
  await db.put(STORE_NAMES.NOTES, storable);
}

export async function getNotesByPdf(pdfId: string): Promise<Note[]> {
  const db = await getDB();
  const all = await db.getAll(STORE_NAMES.NOTES);
  return all
    .filter((n) => n.pdfId === pdfId)
    .map((n) => ({
      ...n,
      createdAt: new Date(n.createdAt),
      updatedAt: new Date(n.updatedAt),
    }));
}

export async function getAllNotes(): Promise<Note[]> {
  const db = await getDB();
  const all = await db.getAll(STORE_NAMES.NOTES);
  return all
    .map((n) => ({
      ...n,
      createdAt: new Date(n.createdAt),
      updatedAt: new Date(n.updatedAt),
    }))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
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
  const doc = await getDocument(pdfId);
  if (doc) {
    doc.currentPage = currentPage;
    doc.scrollPosition = scrollPosition;
    doc.lastOpened = new Date();
    await saveDocument(doc);
  }
}
