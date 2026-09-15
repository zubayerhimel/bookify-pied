import { useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { StickyNote, Trash2, Check, Pencil, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Note } from '@/lib/db/types';
import { cn } from '@/lib/utils';

interface NotesPanelProps {
  open: boolean;
  currentPage: number;
  notes: Note[];
  onClose: () => void;
  onAddNote: () => void;
  onJumpToPage: (page: number) => void;
  onUpdateNote: (id: string, content: string) => Promise<void>;
  onDeleteNote: (id: string) => Promise<void>;
}

export function NotesPanel({
  open,
  currentPage,
  notes,
  onClose,
  onAddNote,
  onJumpToPage,
  onUpdateNote,
  onDeleteNote,
}: NotesPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const sortedNotes = useMemo(
    () =>
      [...notes].sort((a, b) => {
        if (a.pageNumber !== b.pageNumber) return a.pageNumber - b.pageNumber;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }),
    [notes]
  );

  const startEdit = (note: Note) => {
    setEditingId(note.id);
    setDraft(note.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft('');
  };

  const saveEdit = async (id: string) => {
    const content = draft.trim();
    if (!content) return;
    await onUpdateNote(id, content);
    cancelEdit();
  };

  return (
    <aside
      aria-label="Notes panel"
      aria-hidden={!open}
      className={cn(
        'reader-notes-panel fixed top-0 right-0 z-[60] h-full w-full max-w-sm bg-card border-l shadow-medium transition-transform duration-300 flex flex-col',
        open ? 'translate-x-0' : 'translate-x-full pointer-events-none'
      )}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card/95 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <StickyNote className="w-4 h-4 text-primary" />
          <h3 className="font-medium text-foreground">Notes</h3>
          <span className="text-xs text-muted-foreground">
            {notes.length} total
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5"
            onClick={onAddNote}
            title="Add note to current page"
          >
            <Plus className="w-4 h-4" />
            <span>Add</span>
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close notes panel">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-3 space-y-3">
        {sortedNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-12 gap-3">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
              <StickyNote className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground max-w-[220px]">
              No notes yet. Add a note to remember your thoughts on any page.
            </p>
            <Button size="sm" onClick={onAddNote} className="gap-1.5 mt-1">
              <Plus className="w-4 h-4" />
              Add note to page {currentPage}
            </Button>
          </div>
        ) : (
          sortedNotes.map((note) => {
            const isCurrent = note.pageNumber === currentPage;
            const isEditing = editingId === note.id;
            return (
              <div
                key={note.id}
                className={cn(
                  'rounded-lg border p-3 transition-colors',
                  isCurrent
                    ? 'border-primary/40 bg-primary/5'
                    : 'border-border bg-background hover:bg-muted/50'
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <button
                    type="button"
                    onClick={() => onJumpToPage(note.pageNumber)}
                    className={cn(
                      'text-xs font-medium px-2 py-0.5 rounded-full transition-colors',
                      isCurrent
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                    title={`Jump to page ${note.pageNumber}`}
                  >
                    Page {note.pageNumber}
                  </button>
                  <div className="flex items-center gap-0.5">
                    {isEditing ? (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => saveEdit(note.id)}
                          disabled={!draft.trim()}
                          aria-label="Save note"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={cancelEdit}
                          aria-label="Cancel edit"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => startEdit(note)}
                          aria-label="Edit note"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => onDeleteNote(note.id)}
                          aria-label="Delete note"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {note.linkedText && !isEditing && (
                  <p className="text-xs italic text-muted-foreground mb-1.5 line-clamp-2">
                    On: "{note.linkedText}"
                  </p>
                )}

                {isEditing ? (
                  <Textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    className="min-h-24 text-sm resize-none"
                    autoFocus
                  />
                ) : (
                  <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                    {note.content}
                  </p>
                )}

                <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-2">
                  {formatDistanceToNow(new Date(note.updatedAt ?? note.createdAt), {
                    addSuffix: true,
                  })}
                </p>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
