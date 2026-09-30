import type { Note, PDFDocument, Quote } from "@/lib/db/types";

interface QuotesNotesMarkdownInput {
  quotes: Quote[];
  notes: Note[];
  documents: PDFDocument[];
}

// Build an Obsidian/Notion-friendly Markdown document from saved quotes + notes,
// grouped by source document and ordered by page.
export function quotesNotesToMarkdown({ quotes, notes, documents }: QuotesNotesMarkdownInput): string {
  const titleOf = (pdfId: string) => documents.find((d) => d.id === pdfId)?.title ?? "Unknown document";

  const pdfIds = new Set<string>();
  for (const q of quotes) pdfIds.add(q.pdfId);
  for (const n of notes) pdfIds.add(n.pdfId);

  // Keep the library's ordering, then any documents that are no longer present.
  const orderedIds = [...documents.map((d) => d.id).filter((id) => pdfIds.has(id)), ...[...pdfIds].filter((id) => !documents.some((d) => d.id === id))];

  const lines: string[] = ["# Quotes & Notes", ""];
  lines.push(`_Exported from PDF Reader on ${new Date().toISOString().slice(0, 10)}_`, "");

  for (const pdfId of orderedIds) {
    const docQuotes = quotes.filter((q) => q.pdfId === pdfId).sort((a, b) => a.pageNumber - b.pageNumber);
    const docNotes = notes.filter((n) => n.pdfId === pdfId).sort((a, b) => a.pageNumber - b.pageNumber);
    if (docQuotes.length === 0 && docNotes.length === 0) continue;

    lines.push(`## ${titleOf(pdfId)}`, "");

    if (docQuotes.length > 0) {
      lines.push("### Quotes", "");
      for (const quote of docQuotes) {
        const body = quote.text
          .trim()
          .split("\n")
          .map((line) => `> ${line}`)
          .join("\n");
        lines.push(body, `> — Page ${quote.pageNumber}`, "");
      }
    }

    if (docNotes.length > 0) {
      lines.push("### Notes", "");
      for (const note of docNotes) {
        const content = note.content.trim().replace(/\s*\n\s*/g, " ");
        lines.push(`- **Page ${note.pageNumber}** — ${content}`);
        if (note.linkedText?.trim()) {
          lines.push(`  - On: "${note.linkedText.trim()}"`);
        }
      }
      lines.push("");
    }
  }

  return `${lines.join("\n").trim()}\n`;
}
