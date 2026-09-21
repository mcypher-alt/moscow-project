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
import { StatusBadge } from './StatusBadge';
import { RecordActionDialog } from '../RecordActionDialog';
import { IncidentDetailsDialog } from './IncidentDetailsDialog';
import type { Incident, RecordActionPayload } from '@/types';

interface Props {
    incidents: Incident[];
    isLoading: boolean;
    onRecordAction: (params: { incidentId: string; payload: RecordActionPayload }) => Promise<unknown>;
}

export function IncidentsCard({ incidents, isLoading, onRecordAction }: Props) {
    const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

    return (
        <>
            <Card className="border-border bg-card shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg font-semibold text-card-foreground">
                        Журнал текущих инцидентов
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <p className="text-sm text-muted-foreground">Синхронизация журнала...</p>
                    ) : incidents.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Журнал инцидентов пуст.</p>
                    ) : (
                        <div className="rounded-md border border-border overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-border bg-muted/40">
                                        <TableHead className="text-muted-foreground w-[90px]">ID</TableHead>
                                        <TableHead className="text-muted-foreground w-[120px]">Статус</TableHead>
                                        <TableHead className="text-muted-foreground">Угроза / Сценарий</TableHead>
                                        <TableHead className="text-muted-foreground w-[110px]">Горизонт</TableHead>
                                        <TableHead className="text-muted-foreground">Причина (клик для деталей)</TableHead>
                                        <TableHead className="text-muted-foreground w-[160px]">Время фиксации</TableHead>
                                        <TableHead className="text-right text-muted-foreground w-[160px]">Управление</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {incidents.map((incident) => (
                                        <TableRow key={incident.id} className="border-border hover:bg-muted/30 transition-colors">
                                            <TableCell className="font-mono text-xs text-muted-foreground">
                                                {incident.id.slice(0, 8)}
                                            </TableCell>
                                            <TableCell>
                                                <StatusBadge status={incident.status} />
                                            </TableCell>
                                            <TableCell
                                                className="font-medium text-foreground cursor-pointer hover:underline"
                                                onClick={() => setSelectedIncident(incident)}
                                            >
                                                {incident.scenario}
                                            </TableCell>
                                            <TableCell className="text-xs font-mono">
                                                {incident.horizon}
                                            </TableCell>
                                            <TableCell
                                                className="text-xs text-muted-foreground max-w-[260px] cursor-pointer hover:text-foreground hover:underline"
                                                onClick={() => setSelectedIncident(incident)}
                                            >
                                                <div className="line-clamp-2">{incident.reason}</div>
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                                {new Date(incident.createdAt).toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <RecordActionDialog
                                                    incident={incident}
                                                    onSubmit={async (payload) => {
                                                        await onRecordAction({ incidentId: incident.id, payload });
                                                    }}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <IncidentDetailsDialog
                incident={selectedIncident}
                onClose={() => setSelectedIncident(null)}
                onRecordAction={onRecordAction}
            />
        </>
    );
}