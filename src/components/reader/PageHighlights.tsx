import type { Highlight } from '@/lib/db/types';
import { cn } from '@/lib/utils';

interface PageHighlightsProps {
  highlights: Highlight[];
}

const colorClasses: Record<string, string> = {
  yellow: 'bg-reading-highlight/60',
  green: 'bg-reading-highlight-green/60',
  blue: 'bg-reading-highlight-blue/60',
  pink: 'bg-reading-highlight-pink/60',
};

export function PageHighlights({ highlights }: PageHighlightsProps) {
  if (highlights.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {highlights.map((highlight) =>
        highlight.rects.map((rect) => (
          <div
            key={`${highlight.id}-${rect.x}-${rect.y}-${rect.width}-${rect.height}`}
            className={cn(
              'absolute rounded-sm mix-blend-multiply dark:mix-blend-screen transition-opacity',
              colorClasses[highlight.color] || colorClasses.yellow
            )}
            style={{
              left: `${rect.x}%`,
              top: `${rect.y}%`,
              width: `${rect.width}%`,
              height: `${rect.height}%`,
            }}
          />
        ))
      )}
    </div>
  );
}
