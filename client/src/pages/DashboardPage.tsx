import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth, useIncidents, useHotAlerts } from '../hooks/useDispatcher';
import { RecordActionDialog } from '../components/RecordActionDialog';

export function DashboardPage() {
    const { user, logout } = useAuth();
    const { incidents, isLoading: isIncidentsLoading, recordAction } = useIncidents();
    const { alerts, isLoading: isAlertsLoading, acknowledge } = useHotAlerts();

    return (
        <div className="min-h-screen bg-background text-foreground p-6 space-y-6">
            {/* Верхняя панель диспетчера */}
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

            {/* Секция горячих алертов (Критический контур) */}
            <Card className="border-destructive/40 bg-card">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
                            </span>
                            <CardTitle className="text-lg font-semibold text-destructive">
                                Активные аварийные сигналы (SSE Live)
                            </CardTitle>
                        </div>
                        <Badge variant="outline" className="border-destructive/50 text-destructive">
                            Всего: {alerts.length}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    {isAlertsLoading ? (
                        <p className="text-sm text-muted-foreground">Чтение потока телеметрии...</p>
                    ) : alerts.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Активных сигналов тревоги нет.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="border-border">
                                    <TableHead className="text-muted-foreground">Вероятность</TableHead>
                                    <TableHead className="text-muted-foreground">Объект</TableHead>
                                    <TableHead className="text-muted-foreground">Сценарий</TableHead>
                                    <TableHead className="text-muted-foreground">Рекомендация</TableHead>
                                    <TableHead className="text-muted-foreground">Диспетчер</TableHead>
                                    <TableHead className="text-right text-muted-foreground">Действие</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {alerts.map((alert) => {
                                    const probPercent = alert.probability <= 1 
                                        ? Math.round(alert.probability * 100) 
                                        : Math.round(alert.probability);

                                    return (
                                        <TableRow key={alert.id} className="border-border">
                                            <TableCell>
                                                <Badge 
                                                    variant={probPercent >= 70 ? 'destructive' : 'secondary'}
                                                    className="font-mono font-bold"
                                                >
                                                    {probPercent}%
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-mono text-sm">
                                                #{alert.systemObjectId}
                                            </TableCell>
                                            <TableCell className="font-medium text-foreground">
                                                {alert.scenario}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground max-w-[280px] truncate">
                                                {alert.recommendation ?? '—'}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {alert.dispatcherName}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => acknowledge(String(alert.id))}
                                                >
                                                    Квитировать
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Журнал инцидентов */}
            <Card className="border-border bg-card">
                <CardHeader>
                    <CardTitle className="text-lg font-semibold text-card-foreground">
                        Журнал текущих инцидентов
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isIncidentsLoading ? (
                        <p className="text-sm text-muted-foreground">Загрузка журнала...</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="border-border">
                                    <TableHead className="text-muted-foreground">ID</TableHead>
                                    <TableHead className="text-muted-foreground">Статус</TableHead>
                                    <TableHead className="text-muted-foreground">Описание</TableHead>
                                    <TableHead className="text-muted-foreground">Создан</TableHead>
                                    <TableHead className="text-right text-muted-foreground">Управление</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {incidents.map((incident) => (
                                    <TableRow key={incident.id} className="border-border">
                                        <TableCell className="font-mono text-xs text-muted-foreground">
                                            {incident.id.slice(0, 8)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={incident.status === 'OPEN' ? 'destructive' : 'secondary'}
                                            >
                                                {incident.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-foreground">
                                            {incident.recommendation || incident.scenario}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {new Date(incident.createdAt).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <RecordActionDialog
                                                incidentId={incident.id}
                                                onSubmit={(payload) =>
                                                    recordAction({ incidentId: incident.id, payload })
                                                }
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}