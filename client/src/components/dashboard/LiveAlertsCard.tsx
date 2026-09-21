import { useState } from 'react';
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
import { AlertDetailsDialog } from './AlertDetailsDialog';
import type { HotAlert } from '@/types';

interface Props {
    alerts: HotAlert[];
    isLoading: boolean;
    isAcking: boolean;
    onAcknowledge: (id: string | number) => Promise<void>;
}

export function LiveAlertsCard({ alerts, isLoading, isAcking, onAcknowledge }: Props) {
    const [selectedAlert, setSelectedAlert] = useState<HotAlert | null>(null);

    const handleAck = async (id: string | number) => {
        await onAcknowledge(id);
        if (selectedAlert && String(selectedAlert.id) === String(id)) {
            setSelectedAlert(null);
        }
    };

    return (
        <>
            <Card className="border-destructive/40 bg-card shadow-sm">
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
                        <Badge variant="outline" className="border-destructive/50 text-destructive font-mono">
                            Активных: {alerts.length}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <p className="text-sm text-muted-foreground">Подключение к шине телеметрии...</p>
                    ) : alerts.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Активных сигналов тревоги нет. Все узлы в норме.</p>
                    ) : (
                        <div className="rounded-md border border-border overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-border bg-muted/40">
                                        <TableHead className="text-muted-foreground w-[110px]">Горизонт</TableHead>
                                        <TableHead className="text-muted-foreground w-[90px]">Объект</TableHead>
                                        <TableHead className="text-muted-foreground">Угроза / Сценарий</TableHead>
                                        <TableHead className="text-muted-foreground">Причина (клик для деталей)</TableHead>
                                        <TableHead className="text-muted-foreground">Инструкция</TableHead>
                                        <TableHead className="text-muted-foreground w-[140px]">Диспетчер</TableHead>
                                        <TableHead className="text-right text-muted-foreground w-[140px]">Действие</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {alerts.map((alert) => (
                                        <TableRow key={alert.id} className="border-border hover:bg-muted/30 transition-colors">
                                            <TableCell>
                                                <Badge variant="destructive" className="font-mono text-xs whitespace-nowrap">
                                                    {alert.horizon}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-mono text-sm font-semibold">
                                                #{alert.systemObjectId}
                                            </TableCell>
                                            <TableCell className="font-medium text-foreground">
                                                {alert.scenario}
                                            </TableCell>
                                            <TableCell
                                                className="text-xs text-muted-foreground max-w-[220px] cursor-pointer hover:text-foreground hover:underline"
                                                onClick={() => setSelectedAlert(alert)}
                                            >
                                                <div className="line-clamp-2">{alert.reason}</div>
                                            </TableCell>
                                            <TableCell
                                                className="text-xs text-muted-foreground max-w-[220px] cursor-pointer hover:text-foreground hover:underline"
                                                onClick={() => setSelectedAlert(alert)}
                                            >
                                                <div className="line-clamp-2">{alert.recommendation ?? '—'}</div>
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                                {alert.dispatcherName}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    disabled={isAcking}
                                                    onClick={() => handleAck(alert.id)}
                                                >
                                                    Квитировать
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <AlertDetailsDialog
                alert={selectedAlert}
                onClose={() => setSelectedAlert(null)}
                onAcknowledge={handleAck}
                isAcking={isAcking}
            />
        </>
    );
}