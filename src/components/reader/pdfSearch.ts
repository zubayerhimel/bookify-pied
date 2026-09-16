// Text search helpers for the PDF reader.
// A page's text is the join of its pdf.js text items; matches map back to
// per-item character segments so they can be drawn over the rendered spans.

export interface PageTextIndex {
  text: string; // lowercased, item strings joined with heuristic separators
  itemStart: number[]; // itemStart[k] = start char offset of item k in `text`
  itemLen: number[]; // length of item k's string
}

export interface RawMatch {
  start: number;
  end: number;
}

export interface ItemSegment {
  itemIndex: number;
  start: number; // offset within the item's text
  end: number;
}

export function buildPageTextIndex(items: { str: string }[]): PageTextIndex {
  const itemStart: number[] = [];
  const itemLen: number[] = [];
  let text = "";
  let prev = "";

  for (let k = 0; k < items.length; k++) {
    const str = items[k].str;
    // Insert a single separator space only when neither side already has one,
    // so phrases split across visually-separate items still match.
    if (k > 0 && !/\s$/.test(prev) && !/^\s/.test(str)) {
      text += " ";
    }
    itemStart[k] = text.length;
    itemLen[k] = str.length;
    text += str;
    prev = str;
  }

  return { text: text.toLowerCase(), itemStart, itemLen };
}

export function findMatches(index: PageTextIndex, queryLower: string): RawMatch[] {
  const matches: RawMatch[] = [];
  if (!queryLower) return matches;

  const hay = index.text;
  let from = 0;
  for (;;) {
    const found = hay.indexOf(queryLower, from);
    if (found === -1) break;
    matches.push({ start: found, end: found + queryLower.length });
    from = found + queryLower.length; // non-overlapping
  }
  return matches;
}

export function matchToSegments(index: PageTextIndex, match: RawMatch): ItemSegment[] {
  const segments: ItemSegment[] = [];

  for (let k = 0; k < index.itemStart.length; k++) {
    const itemStart = index.itemStart[k];
    const itemEnd = itemStart + index.itemLen[k];
    if (itemEnd <= match.start) continue;
    if (itemStart >= match.end) break;

    const start = Math.max(match.start, itemStart) - itemStart;
    const end = Math.min(match.end, itemEnd) - itemStart;
    if (end > start) segments.push({ itemIndex: k, start, end });
  }

  return segments;
}
