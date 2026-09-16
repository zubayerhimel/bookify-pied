import { ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { forwardRef } from 'react';
import { Button } from '@/components/ui/button';

interface SearchBarProps {
  query: string;
  onQueryChange: (value: string) => void;
  total: number;
  activeOrdinal: number;
  indexing: boolean;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  function SearchBar(
    {
      query,
      onQueryChange,
      total,
      activeOrdinal,
      indexing,
      onNext,
      onPrev,
      onClose,
    },
    ref
  ) {
    const hasQuery = query.trim().length > 0;
    const status = hasQuery
      ? indexing
        ? 'Searching…'
        : total > 0
          ? `${activeOrdinal} of ${total}`
          : 'No results'
      : '';

    return (
      <div className="flex items-center gap-1 rounded-lg border bg-card/95 px-2 py-1.5 shadow-medium backdrop-blur-sm">
        <Search className="w-4 h-4 shrink-0 text-muted-foreground" />
        <input
          ref={ref}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              if (event.shiftKey) onPrev();
              else onNext();
            } else if (event.key === 'Escape') {
              event.preventDefault();
              onClose();
            }
          }}
          placeholder="Find in document"
          aria-label="Find in document"
          className="w-40 bg-transparent text-sm outline-none placeholder:text-muted-foreground sm:w-56"
        />
        {status && (
          <span className="min-w-16 whitespace-nowrap text-right text-xs text-muted-foreground tabular-nums">
            {status}
          </span>
        )}
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onPrev}
            disabled={total === 0}
            aria-label="Previous match"
          >
            <ChevronUp className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onNext}
            disabled={total === 0}
            aria-label="Next match"
          >
            <ChevronDown className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onClose}
            aria-label="Close search"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }
);
