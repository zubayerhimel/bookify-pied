import {
  Bookmark,
  BookOpen,
  Highlighter,
  Leaf,
  Lock,
  Moon,
  MoonStar,
  Quote,
  Search,
  StickyNote,
  Sun,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const features = [
  {
    icon: Highlighter,
    title: 'Highlight in four colors',
    body: 'Mark passages as you read. They stay pinned to the page, ready the next time you open the book.',
  },
  {
    icon: Quote,
    title: 'Collect the lines you love',
    body: 'Save quotes with a tap and gather them all in one place you can browse anytime.',
  },
  {
    icon: StickyNote,
    title: 'Leave notes in the margin',
    body: 'Attach your own thinking to any passage, so a re-read picks up where your mind left off.',
  },
  {
    icon: Bookmark,
    title: 'Bookmark and resume',
    body: 'Drop bookmarks on pages that matter and reopen exactly where you stopped reading.',
  },
  {
    icon: Search,
    title: 'Find any line',
    body: 'Search the full text of a document and jump between matches without losing your place.',
  },
  {
    icon: Lock,
    title: 'Yours alone',
    body: 'Every book, highlight, and note is stored on your device. Nothing is uploaded anywhere.',
  },
];

// Fixed palettes so the three reading modes always render true to themselves,
// regardless of the app's current theme.
const readingModes = [
  {
    name: 'Paper',
    icon: Sun,
    surface: 'hsl(48 15% 96%)',
    ink: 'hsl(168 24% 12%)',
    faint: 'hsl(145 12% 86%)',
  },
  {
    name: 'Sepia',
    icon: BookOpen,
    surface: 'hsl(40 34% 90%)',
    ink: 'hsl(28 26% 18%)',
    faint: 'hsl(38 24% 80%)',
  },
  {
    name: 'Sage',
    icon: Leaf,
    surface: 'hsl(124 20% 91%)',
    ink: 'hsl(165 30% 13%)',
    faint: 'hsl(130 15% 79%)',
  },
  {
    name: 'Night',
    icon: Moon,
    surface: 'hsl(170 22% 8%)',
    ink: 'hsl(44 18% 86%)',
    faint: 'hsl(168 14% 20%)',
  },
  {
    name: 'Midnight',
    icon: MoonStar,
    surface: 'hsl(174 24% 4%)',
    ink: 'hsl(44 16% 88%)',
    faint: 'hsl(170 16% 14%)',
  },
];

function ReaderMockup() {
  return (
    <div className="hero-mockup-in relative mx-auto w-full max-w-md">
      {/* The page */}
      <div className="relative rotate-1 rounded-2xl bg-card p-3 shadow-book ring-1 ring-border/70">
        <div className="flex gap-3 rounded-xl bg-background/60 p-3">
          {/* Outline rail */}
          <div className="hidden w-20 shrink-0 flex-col gap-2 border-r border-border/70 pr-3 sm:flex">
            <div className="h-2 w-14 rounded-full bg-primary/25" />
            <div className="h-2 w-10 rounded-full bg-muted-foreground/25" />
            <div className="h-2 w-12 rounded-full bg-muted-foreground/25" />
            <div className="h-2 w-8 rounded-full bg-muted-foreground/25" />
            <div className="mt-auto flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Bookmark className="h-3 w-3 fill-brass text-brass" />
              <span>p. 128</span>
            </div>
          </div>

          {/* Page body */}
          <div className="min-w-0 flex-1">
            <p className="font-reading text-sm font-semibold text-foreground">
              Chapter Four
            </p>
            <div className="mt-3 space-y-2">
              <div className="h-2 w-full rounded-full bg-muted-foreground/20" />
              <div className="h-2 w-[92%] rounded-full bg-muted-foreground/20" />
              <div className="w-fit rounded-[3px] bg-[hsl(var(--reading-highlight)/0.6)] px-1 py-0.5">
                <div className="h-2 w-40 rounded-full bg-muted-foreground/30" />
              </div>
              <div className="h-2 w-[84%] rounded-full bg-muted-foreground/20" />
              <div className="h-2 w-full rounded-full bg-muted-foreground/20" />
              <div className="h-2 w-[70%] rounded-full bg-muted-foreground/20" />
            </div>

            {/* Reading progress */}
            <div className="mt-5">
              <div className="reading-progress">
                <div
                  className="reading-progress-bar"
                  style={{ width: '68%' }}
                />
              </div>
              <p className="mt-1.5 text-[10px] text-muted-foreground">
                68% · about 24 minutes left
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Floating "quote saved" chip for depth */}
      <div className="absolute -bottom-5 -left-4 hidden -rotate-2 items-center gap-2 rounded-xl bg-card px-3 py-2 shadow-medium ring-1 ring-border/70 sm:flex">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
          <Quote className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="leading-tight">
          <p className="text-[11px] font-medium text-foreground">Quote saved</p>
          <p className="text-[10px] text-muted-foreground">
            Added to your notes
          </p>
        </div>
      </div>
    </div>
  );
}

export function Landing() {
  return (
    <div className="landing-root">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="container mx-auto px-4 py-16 sm:py-24 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="hero-reveal max-w-xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
                <BookOpen className="h-3.5 w-3.5" />
                Local-first PDF reader
              </span>

              <h1 className="mt-5 font-reading text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Turn every PDF into a book{' '}
                <span className="hl-swipe">worth returning to</span>.
              </h1>

              <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">
                A calm reading room for your documents. Highlight passages,
                collect quotes, leave notes, and come back to the exact page you
                left — all kept privately on your device.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  to="/library"
                  className={cn(
                    buttonVariants({ size: 'lg' }),
                    'landing-cta gap-2 px-8 shadow-medium'
                  )}
                >
                  <BookOpen className="h-4 w-4" />
                  Open your library
                </Link>
                <a
                  href="#features"
                  className={cn(
                    buttonVariants({ variant: 'outline', size: 'lg' }),
                    'landing-cta px-6'
                  )}
                >
                  See what's inside
                </a>
              </div>

              <p className="mt-5 text-sm text-muted-foreground">
                No account. No cloud. Works offline.
              </p>
            </div>

            <ReaderMockup />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-20 border-t border-border/60">
        <div className="container mx-auto px-4 py-16 sm:py-24">
          <div className="max-w-2xl">
            <h2 className="font-reading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Built for reading closely, not just viewing.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Everything you need to sit with a document — and nothing that gets
              between you and the page.
            </p>
          </div>

          <div className="mt-14 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="max-w-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 font-reading text-xl font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-2 leading-relaxed text-muted-foreground">
                  {feature.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reading modes */}
      <section className="border-t border-border/60 bg-secondary/40">
        <div className="container mx-auto px-4 py-16 sm:py-24">
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-16">
            <div className="max-w-md">
              <h2 className="font-reading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Read in your kind of light.
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Choose from five themes — bright paper, warm sepia, restful
                sage, deep dark, or near-black midnight — whichever suits the
                hour. Your choice is remembered for next time.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {readingModes.map((mode) => (
                <figure
                  key={mode.name}
                  className="overflow-hidden rounded-2xl shadow-soft ring-1 ring-border/70"
                  style={{ backgroundColor: mode.surface }}
                >
                  <div className="space-y-2.5 p-5">
                    <div
                      className="h-2 rounded-full"
                      style={{ backgroundColor: mode.ink, width: '55%' }}
                    />
                    <div
                      className="h-2 rounded-full"
                      style={{ backgroundColor: mode.faint }}
                    />
                    <div
                      className="h-2 rounded-full"
                      style={{ backgroundColor: mode.faint, width: '86%' }}
                    />
                    <div
                      className="h-2 rounded-full"
                      style={{ backgroundColor: mode.faint, width: '72%' }}
                    />
                  </div>
                  <figcaption
                    className="flex items-center gap-2 px-5 pb-5 pt-1 text-sm font-medium"
                    style={{ color: mode.ink }}
                  >
                    <mode.icon className="h-4 w-4" />
                    {mode.name}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Local-first band */}
      <section className="border-t border-border/60">
        <div className="container mx-auto px-4 py-16 sm:py-20">
          <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Lock className="h-6 w-6" />
            </div>
            <h2 className="mt-6 font-reading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Your library never leaves this device.
            </h2>
            <p className="mt-4 max-w-xl text-lg text-muted-foreground">
              Books, highlights, quotes, and notes are saved right in your
              browser and stay available offline. There's no account to create
              and nothing to sync — it's simply yours.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-border/60 bg-secondary/40">
        <div className="container mx-auto px-4 py-16 text-center sm:py-24">
          <h2 className="font-reading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Ready to start reading?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-lg text-muted-foreground">
            Open your library and drop in a PDF. You'll be reading in seconds.
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              to="/library"
              className={cn(
                buttonVariants({ size: 'lg' }),
                'landing-cta gap-2 px-8 shadow-medium'
              )}
            >
              <BookOpen className="h-4 w-4" />
              Open your library
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <BookOpen className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-reading text-lg font-semibold text-foreground">
              PDF Reader
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            A quiet place to read your PDFs.
          </p>
        </div>
      </footer>
    </div>
  );
}
