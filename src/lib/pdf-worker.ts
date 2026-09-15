import { pdfjs } from 'react-pdf';

// Bundled with the app so the viewer works offline and matches react-pdf's pdfjs version.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();
