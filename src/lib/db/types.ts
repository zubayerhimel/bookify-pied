// Database types for the PDF Reader application

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink';

export interface PDFDocument {
  id: string;
  title: string;
  fileName: string;
  fileSize: number;
  totalPages: number;
  currentPage: number;
  scrollPosition: number;
  lastOpened: Date;
  createdAt: Date;
  coverThumbnail?: string; // Base64 encoded thumbnail
}

export interface PDFFile {
  id: string; // Same as PDFDocument id
  data: Blob | ArrayBuffer;
}

export interface Highlight {
  id: string;
  pdfId: string;
  pageNumber: number;
  text: string;
  color: HighlightColor;
  rects: HighlightRect[];
  createdAt: Date;
}

export interface HighlightRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Quote {
  id: string;
  pdfId: string;
  pageNumber: number;
  text: string;
  createdAt: Date;
}

export interface Note {
  id: string;
  pdfId: string;
  pageNumber: number;
  linkedText?: string; // Text the note is attached to
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReadingProgress {
  pdfId: string;
  currentPage: number;
  scrollPosition: number;
  lastUpdated: Date;
}

// Store names for IndexedDB
export const STORE_NAMES = {
  DOCUMENTS: 'documents',
  FILES: 'files',
  HIGHLIGHTS: 'highlights',
  QUOTES: 'quotes',
  NOTES: 'notes',
} as const;

export const DB_NAME = 'kindle-pdf-reader';
export const DB_VERSION = 1;
