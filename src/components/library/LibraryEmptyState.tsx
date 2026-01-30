import { motion } from 'framer-motion';
import { Upload, BookOpen, FileText, Highlighter } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LibraryEmptyStateProps {
  onUploadClick: () => void;
}

export function LibraryEmptyState({ onUploadClick }: LibraryEmptyStateProps) {
  const features = [
    {
      icon: BookOpen,
      title: 'Distraction-free reading',
      description: 'Light, sepia, and dark modes for comfortable reading',
    },
    {
      icon: Highlighter,
      title: 'Highlight & annotate',
      description: 'Save quotes and add notes to important passages',
    },
    {
      icon: FileText,
      title: 'Track your progress',
      description: 'Resume reading exactly where you left off',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      {/* Illustration */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-primary/10 rounded-full blur-3xl scale-150" />
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="relative w-32 h-32 bg-gradient-to-br from-primary/20 to-primary/5 rounded-3xl flex items-center justify-center"
        >
          <BookOpen className="w-16 h-16 text-primary" />
        </motion.div>
      </div>

      <h2 className="text-2xl font-semibold text-foreground mb-2 text-center">
        Your library is empty
      </h2>
      <p className="text-muted-foreground text-center max-w-md mb-8">
        Upload your first PDF to start reading. Your books will be saved locally for offline access.
      </p>

      <Button onClick={onUploadClick} size="lg" className="gap-2 shadow-medium mb-12">
        <Upload className="w-5 h-5" />
        Upload your first PDF
      </Button>

      {/* Features */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl w-full">
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.1 }}
            className="flex flex-col items-center text-center p-4"
          >
            <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center mb-3">
              <feature.icon className="w-6 h-6 text-accent-foreground" />
            </div>
            <h3 className="font-medium text-foreground mb-1">{feature.title}</h3>
            <p className="text-sm text-muted-foreground">{feature.description}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
