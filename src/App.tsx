import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ReaderProvider } from "@/contexts/ReaderContext";
import { Header } from "@/components/layout/Header";
import { PDFReader } from "@/components/reader/PDFReader";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import DashboardPage from "./pages/DashboardPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ReaderProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="min-h-screen bg-background">
            <Header />
            <main>
              <ErrorBoundary title="Page failed to render">
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </ErrorBoundary>
            </main>
            <PDFReader />
          </div>
        </BrowserRouter>
      </ReaderProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
