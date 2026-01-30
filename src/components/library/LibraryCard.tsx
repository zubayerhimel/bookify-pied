import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { MoreVertical, Pencil, Trash2, Clock, FileText } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PDFDocument } from '@/lib/db/types';
import { useLibrary } from '@/hooks/useLibrary';
import { formatDistanceToNow } from 'date-fns';

interface LibraryCardProps {
  document: PDFDocument;
  onOpen: (doc: PDFDocument) => void;
}

export function LibraryCard({ document: doc, onOpen }: LibraryCardProps) {
  const { renameDocument, deleteDocument } = useLibrary();
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [newTitle, setNewTitle] = useState(doc.title);

  const progressPercent = Math.round((doc.currentPage / doc.totalPages) * 100);

  const handleRename = useCallback(async () => {
    if (newTitle.trim() && newTitle !== doc.title) {
      await renameDocument(doc.id, newTitle.trim());
    }
    setIsRenameOpen(false);
  }, [doc.id, doc.title, newTitle, renameDocument]);

  const handleDelete = useCallback(async () => {
    await deleteDocument(doc.id);
    setIsDeleteOpen(false);
  }, [doc.id, deleteDocument]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <>
      <motion.div
        whileHover={{ y: -4 }}
        className="book-card bg-card cursor-pointer group"
        onClick={() => onOpen(doc)}
      >
        {/* Cover Thumbnail */}
        <div className="relative aspect-[3/4] bg-muted overflow-hidden">
          {doc.coverThumbnail ? (
            <img
              src={doc.coverThumbnail}
              alt={doc.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
              <FileText className="w-12 h-12 text-primary/40" />
            </div>
          )}

          {/* Progress Overlay */}
          {progressPercent > 0 && progressPercent < 100 && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
              <div className="reading-progress">
                <div
                  className="reading-progress-bar"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-xs text-white/90 mt-1">{progressPercent}% complete</p>
            </div>
          )}

          {/* Menu Button */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8 rounded-full bg-background/90 backdrop-blur-sm shadow-soft"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onClick={() => setIsRenameOpen(true)}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setIsDeleteOpen(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Card Info */}
        <div className="p-3">
          <h3 className="font-medium text-foreground line-clamp-2 leading-tight mb-1">
            {doc.title}
          </h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {doc.totalPages} pages
            </span>
            <span>•</span>
            <span>{formatFileSize(doc.fileSize)}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <Clock className="w-3 h-3" />
            <span>
              {formatDistanceToNow(new Date(doc.lastOpened), { addSuffix: true })}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Rename Dialog */}
      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Rename Document</DialogTitle>
          </DialogHeader>
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Enter new title"
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{doc.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this document and all associated highlights, quotes, and notes.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
