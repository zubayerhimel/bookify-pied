import { useState, useEffect, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Quote as QuoteIcon,
  StickyNote,
  FileText,
  Calendar,
  Trash2,
  ChevronRight,
  Filter,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import type { Quote, Note, PDFDocument } from '@/lib/db/types';
import {
  getAllQuotes,
  getAllNotes,
  getAllDocuments,
  deleteQuote,
  deleteNote,
} from '@/lib/db/database';
import { useNavigate } from 'react-router-dom';

export function Dashboard() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [documents, setDocuments] = useState<PDFDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPdfId, setFilterPdfId] = useState<string>('all');
  const [deleteItem, setDeleteItem] = useState<{ type: 'quote' | 'note'; id: string } | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [q, n, d] = await Promise.all([
          getAllQuotes(),
          getAllNotes(),
          getAllDocuments(),
        ]);
        setQuotes(q);
        setNotes(n);
        setDocuments(d);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredQuotes = useMemo(() => {
    return quotes.filter((q) => {
      const matchesPdf = filterPdfId === 'all' || q.pdfId === filterPdfId;
      const matchesSearch =
        !searchQuery || q.text.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesPdf && matchesSearch;
    });
  }, [quotes, filterPdfId, searchQuery]);

  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      const matchesPdf = filterPdfId === 'all' || n.pdfId === filterPdfId;
      const matchesSearch =
        !searchQuery ||
        n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.linkedText?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesPdf && matchesSearch;
    });
  }, [notes, filterPdfId, searchQuery]);

  const getDocumentTitle = (pdfId: string): string => {
    const doc = documents.find((d) => d.id === pdfId);
    return doc?.title || 'Unknown Document';
  };

  const handleNavigateToPage = (pdfId: string, pageNumber: number) => {
    navigate(`/read/${pdfId}?page=${pageNumber}`);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteItem) return;

    if (deleteItem.type === 'quote') {
      await deleteQuote(deleteItem.id);
      setQuotes((prev) => prev.filter((q) => q.id !== deleteItem.id));
    } else {
      await deleteNote(deleteItem.id);
      setNotes((prev) => prev.filter((n) => n.id !== deleteItem.id));
    }
    setDeleteItem(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold text-foreground mb-2">
          Quotes & Notes
        </h1>
        <p className="text-muted-foreground">
          All your saved quotes and notes from your library
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search quotes and notes..."
            className="pl-9"
          />
        </div>
        <Select value={filterPdfId} onValueChange={setFilterPdfId}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter by document" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Documents</SelectItem>
            {documents.map((doc) => (
              <SelectItem key={doc.id} value={doc.id}>
                {doc.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="quotes" className="w-full">
        <TabsList className="w-full grid grid-cols-2 mb-6">
          <TabsTrigger value="quotes" className="gap-2">
            <QuoteIcon className="w-4 h-4" />
            Quotes ({filteredQuotes.length})
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-2">
            <StickyNote className="w-4 h-4" />
            Notes ({filteredNotes.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quotes">
          {filteredQuotes.length === 0 ? (
            <EmptyState type="quotes" />
          ) : (
            <div className="space-y-4">
              {filteredQuotes.map((quote) => (
                <div
                  key={quote.id}
                  className="group bg-card border rounded-xl p-4 shadow-soft hover:shadow-medium transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <blockquote className="font-reading text-lg text-foreground leading-relaxed border-l-4 border-primary/30 pl-4 italic">
                        "{quote.text}"
                      </blockquote>
                      <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" />
                          {getDocumentTitle(quote.pdfId)}
                        </span>
                        <span>Page {quote.pageNumber}</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDistanceToNow(new Date(quote.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleNavigateToPage(quote.pdfId, quote.pageNumber)}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteItem({ type: 'quote', id: quote.id })}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="notes">
          {filteredNotes.length === 0 ? (
            <EmptyState type="notes" />
          ) : (
            <div className="space-y-4">
              {filteredNotes.map((note) => (
                <div
                  key={note.id}
                  className="group bg-card border rounded-xl p-4 shadow-soft hover:shadow-medium transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      {note.linkedText && (
                        <p className="text-sm text-muted-foreground italic mb-2 line-clamp-2">
                          On: "{note.linkedText}"
                        </p>
                      )}
                      <p className="text-foreground">{note.content}</p>
                      <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" />
                          {getDocumentTitle(note.pdfId)}
                        </span>
                        <span>Page {note.pageNumber}</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleNavigateToPage(note.pdfId, note.pageNumber)}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteItem({ type: 'note', id: note.id })}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete this {deleteItem?.type}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The {deleteItem?.type} will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EmptyState({ type }: { type: 'quotes' | 'notes' }) {
  const Icon = type === 'quotes' ? QuoteIcon : StickyNote;
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium text-foreground mb-1">
        No {type} yet
      </h3>
      <p className="text-muted-foreground max-w-sm">
        {type === 'quotes'
          ? 'Select text while reading and save it as a quote to see it here.'
          : 'Add notes to passages while reading to see them here.'}
      </p>
    </div>
  );
}
