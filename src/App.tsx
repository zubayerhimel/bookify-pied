import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import DashboardPage from "./pages/DashboardPage";
import ReaderPage from "./pages/ReaderPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppLayout = () => (
  <div className="min-h-screen bg-background">
    <Header />
    <main>
      <Outlet />
    </main>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ErrorBoundary title="Page failed to render">
          <Routes>
            <Route path="/read/:id" element={<ReaderPage />} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<Index />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
