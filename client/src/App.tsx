import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './components/ui/theme-provider';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { useAuth } from './hooks/useDispatcher';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: false, // Чтобы при 401 на /auth/me не долбило бэкенд повторами
        },
    },
});

function AppContent() {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground font-mono text-sm">
                Инициализация рабочего места...
            </div>
        );
    }

    return user ? <DashboardPage /> : <LoginPage />;
}

export default function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider defaultTheme="dark">
                <AppContent />
            </ThemeProvider>
        </QueryClientProvider>
    );
}