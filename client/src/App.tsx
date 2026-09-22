import { MapPage } from "./pages/MapPage";
import { JournalPage } from "./pages/JournalPage";
import { ObjectDetailsPage } from "./pages/ObjectDetailsPage";
import { ObjectsPage } from "./pages/ObjectsPage";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ForecastsPage } from "./pages/ForecastsPage";
import { ThemeProvider } from "./components/ui/theme-provider";
import { AppLayout } from "./components/AppLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { useAuth } from "./hooks/useDispatcher";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});


function AppRoutes() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Инициализация рабочего места...
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/objects" element={<ObjectsPage />} />
        <Route path="/objects/:id" element={<ObjectDetailsPage />} />
        <Route path="/forecasts" element={<ForecastsPage />} />
        <Route path="/journal" element={<JournalPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
