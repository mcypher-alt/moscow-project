import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth, useIncidents, useHotAlerts } from '../hooks/useDispatcher';
import { LiveAlertsCard } from '../components/dashboard/LiveAlertsCard';
import { IncidentsCard } from '../components/dashboard/IncidentsCard';

export function DashboardPage() {
    const { user, logout } = useAuth();
    const { incidents, isLoading: isIncidentsLoading, recordAction } = useIncidents();
    const { alerts, isLoading: isAlertsLoading, acknowledge, isAcking } = useHotAlerts();

    return (
        <div className="min-h-screen bg-background text-foreground p-6 space-y-6">
            <header className="flex justify-between items-center border-b border-border pb-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight">Пульт диспетчерской службы</h1>
                    <p className="text-sm text-muted-foreground">
                        Оператор: {user ? `${user.name} (${user.role})` : 'Загрузка...'}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <ThemeToggle />
                    <Button variant="destructive" size="sm" onClick={() => logout()}>
                        Завершить смену
                    </Button>
                </div>
            </header>

            <LiveAlertsCard
                alerts={alerts}
                isLoading={isAlertsLoading}
                isAcking={isAcking}
                onAcknowledge={async (id) => {
                    await acknowledge(String(id));
                }}
            />

            <IncidentsCard
                incidents={incidents}
                isLoading={isIncidentsLoading}
                onRecordAction={recordAction}
            />
        </div>
    );
}