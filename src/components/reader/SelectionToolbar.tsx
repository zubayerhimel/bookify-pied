import { useState, useCallback } from 'react';
import { Quote, StickyNote, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { HighlightColor } from '@/lib/db/types';
import { cn } from '@/lib/utils';

interface SelectionToolbarProps {
  position: { x: number; y: number };
  onHighlight: (color: HighlightColor) => void;
  onSaveQuote: () => void;
  onAddNote: (content: string) => void;
  onClose: () => void;
}

const highlightColors: { color: HighlightColor; className: string; label: string }[] = [
  { color: 'yellow', className: 'bg-reading-highlight', label: 'Yellow' },
  { color: 'green', className: 'bg-reading-highlight-green', label: 'Green' },
  { color: 'blue', className: 'bg-reading-highlight-blue', label: 'Blue' },
  { color: 'pink', className: 'bg-reading-highlight-pink', label: 'Pink' },
];

export function SelectionToolbar({
  position,
  onHighlight,
  onSaveQuote,
  onAddNote,
  onClose,
}: SelectionToolbarProps) {
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteContent, setNoteContent] = useState('');

  const handleSaveNote = useCallback(() => {
    if (noteContent.trim()) {
      onAddNote(noteContent.trim());
      setNoteContent('');
      setShowNoteInput(false);
    }
  }, [noteContent, onAddNote]);

  return (
    <div
      className="floating-toolbar flex-col"
      style={{
        left: Math.max(10, Math.min(position.x - 100, window.innerWidth - 220)),
        top: position.y,
      }}
    >
      {showNoteInput ? (
        <div className="w-64">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Add Note</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setShowNoteInput(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <Textarea
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            placeholder="Write your note..."
            className="min-h-[80px] text-sm resize-none"
            autoFocus
          />
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" size="sm" onClick={() => setShowNoteInput(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveNote} disabled={!noteContent.trim()}>
              Save
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          {/* Highlight Colors */}
          <div className="flex items-center gap-0.5 pr-2 border-r">
            {highlightColors.map(({ color, className, label }) => (
              <button
                type="button"
                key={color}
                onClick={() => onHighlight(color)}
                className={cn(
                  'w-6 h-6 rounded-full transition-transform hover:scale-110',
                  className
                )}
                title={`Highlight ${label}`}
              />
            ))}
          </div>

          {/* Quote Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onSaveQuote}
            title="Save as Quote"
          >
            <Quote className="w-4 h-4" />
          </Button>

          {/* Note Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setShowNoteInput(true)}
            title="Add Note"
          >
            <StickyNote className="w-4 h-4" />
          </Button>

          {/* Close Button */}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
