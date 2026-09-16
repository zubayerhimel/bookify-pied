import { Component, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

type Props = {
  children: ReactNode;
  title?: string;
};

type State = {
  hasError: boolean;
  message?: string;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : String(error);
    return { hasError: true, message };
  }

  componentDidCatch(error: unknown) {
    // Keep this console.error: it’s critical for debugging blank-screen issues.
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] Caught error:', error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="container mx-auto px-4 py-10 max-w-3xl">
        <div className="rounded-xl border bg-card p-6 shadow-soft text-left">
          <h1 className="text-xl font-semibold text-foreground">
            {this.props.title ?? 'Something went wrong'}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The app hit a runtime error while rendering this page. Reloading
            usually fixes it.
          </p>
          <pre className="mt-4 whitespace-pre-wrap wrap-break-word rounded-lg bg-muted p-3 text-xs text-foreground">
            {this.state.message ?? 'Unknown error'}
          </pre>
          <div className="mt-4 flex items-center gap-2">
            <Button onClick={() => window.location.reload()}>Reload</Button>
            <Button
              variant="secondary"
              onClick={() =>
                this.setState({ hasError: false, message: undefined })
              }
            >
              Try again
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
