import { ChevronDown, ChevronRight, ListTree, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface TocItem {
  title: string;
  pageNumber: number | null;
  items: TocItem[];
}

interface OutlineSidebarProps {
  open: boolean;
  outline: TocItem[];
  currentPage: number;
  onClose: () => void;
  onNavigate: (page: number) => void;
}

function collectTopLevelKeys(items: TocItem[]): Set<string> {
  const keys = new Set<string>();
  items.forEach((item, index) => {
    if (item.items.length > 0) keys.add(`-${index}`);
  });
  return keys;
}

// The active entry is the deepest heading whose page is at or before the current page.
function findActivePage(items: TocItem[], currentPage: number): number | null {
  let best: number | null = null;
  const walk = (nodes: TocItem[]) => {
    for (const node of nodes) {
      if (
        node.pageNumber !== null &&
        node.pageNumber <= currentPage &&
        (best === null || node.pageNumber > best)
      ) {
        best = node.pageNumber;
      }
      if (node.items.length > 0) walk(node.items);
    }
  };
  walk(items);
  return best;
}

interface OutlineNodesProps {
  items: TocItem[];
  level: number;
  path: string;
  activePage: number | null;
  expanded: Set<string>;
  onToggle: (key: string) => void;
  onNavigate: (page: number) => void;
}

function OutlineNodes({
  items,
  level,
  path,
  activePage,
  expanded,
  onToggle,
  onNavigate,
}: OutlineNodesProps) {
  return (
    <ul className="space-y-0.5">
      {items.map((item, index) => {
        const key = `${path}-${index}`;
        const hasChildren = item.items.length > 0;
        const isExpanded = expanded.has(key);
        const isActive =
          item.pageNumber !== null && item.pageNumber === activePage;

        return (
          <li key={key}>
            <div
              className="flex items-stretch gap-0.5"
              style={{ paddingLeft: `${level * 12}px` }}
            >
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => onToggle(key)}
                  className="flex h-7 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                  aria-label={
                    isExpanded ? 'Collapse section' : 'Expand section'
                  }
                  aria-expanded={isExpanded}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" />
                  )}
                </button>
              ) : (
                <span className="h-7 w-5 shrink-0" aria-hidden="true" />
              )}

              <button
                type="button"
                onClick={() =>
                  item.pageNumber !== null && onNavigate(item.pageNumber)
                }
                disabled={item.pageNumber === null}
                title={item.title}
                className={cn(
                  'flex min-w-0 flex-1 items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground hover:bg-muted',
                  item.pageNumber === null && 'cursor-default opacity-70'
                )}
              >
                <span className="truncate">{item.title}</span>
                {item.pageNumber !== null && (
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {item.pageNumber}
                  </span>
                )}
              </button>
            </div>

            {hasChildren && isExpanded && (
              <OutlineNodes
                items={item.items}
                level={level + 1}
                path={key}
                activePage={activePage}
                expanded={expanded}
                onToggle={onToggle}
                onNavigate={onNavigate}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function OutlineSidebar({
  open,
  outline,
  currentPage,
  onClose,
  onNavigate,
}: OutlineSidebarProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() =>
    collectTopLevelKeys(outline)
  );

  // Reset expansion when a different document's outline arrives.
  useEffect(() => {
    setExpanded(collectTopLevelKeys(outline));
  }, [outline]);

  const activePage = useMemo(
    () => findActivePage(outline, currentPage),
    [outline, currentPage]
  );

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <aside
      aria-label="Table of contents"
      aria-hidden={!open}
      className={cn(
        'reader-outline-panel fixed top-0 left-0 z-60 flex h-full w-full max-w-xs flex-col border-r bg-card shadow-medium transition-transform duration-300',
        open ? 'translate-x-0' : '-translate-x-full pointer-events-none'
      )}
    >
      <div className="flex items-center justify-between border-b bg-card/95 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <ListTree className="h-4 w-4 text-primary" />
          <h3 className="font-medium text-foreground">Contents</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Close contents"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <nav className="custom-scrollbar flex-1 overflow-y-auto px-2 py-3">
        {outline.length === 0 ? (
          <p className="px-2 py-8 text-center text-sm text-muted-foreground">
            This document has no table of contents.
          </p>
        ) : (
          <OutlineNodes
            items={outline}
            level={0}
            path=""
            activePage={activePage}
            expanded={expanded}
            onToggle={toggle}
            onNavigate={onNavigate}
          />
        )}
      </nav>
    </aside>
  );
}
