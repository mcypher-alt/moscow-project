import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusBadge } from './StatusBadge';
import { RecordActionDialog } from '../RecordActionDialog';
import type { Incident, RecordActionPayload } from '@/types';

interface Props {
    incident: Incident | null;
    onClose: () => void;
    onRecordAction: (params: { incidentId: string; payload: RecordActionPayload }) => Promise<unknown>;
}

export function IncidentDetailsDialog({ incident, onClose, onRecordAction }: Props) {
    return (
        <Dialog open={!!incident} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-1">
                        {incident && <StatusBadge status={incident.status} />}
                        <Badge variant="outline" className="font-mono text-xs">
                            Горизонт: {incident?.horizon}
                        </Badge>
                        <span className="text-xs font-mono text-muted-foreground ml-auto">
                            ID: {incident?.id.slice(0, 8)}
                        </span>
                    </div>
                    <DialogTitle className="text-xl font-bold text-foreground">
                        {incident?.scenario}
                    </DialogTitle>
                    <DialogDescription className="text-muted-foreground text-xs">
                        Объект #{incident?.systemObjectId}
                        {incident?.systemObject?.dispatcherName ? ` • ${incident.systemObject.dispatcherName}` : ''}
                        {' • Зарегистрирован: '}
                        {incident?.createdAt ? new Date(incident.createdAt).toLocaleString() : '—'}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 text-sm mt-2">
                    <div className="space-y-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Физическая причина / Зафиксированный триггер:
                        </span>
                        <div className="bg-muted/70 border border-border p-3 rounded-md text-foreground font-mono text-xs leading-relaxed">
                            {incident?.reason}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Регламентные указания для устранения:
                        </span>
                        <div className="bg-muted/70 border border-border p-3 rounded-md text-foreground text-xs leading-relaxed">
                            {incident?.recommendation ?? 'Инструкции не заданы. Руководствоваться регламентом объекта.'}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" size="sm" onClick={onClose}>
                        Закрыть
                    </Button>
                    {incident && (
                        <RecordActionDialog
                            incidentId={incident.id}
                            onSubmit={async (payload) => {
                                await onRecordAction({ incidentId: incident.id, payload });
                                onClose();
                            }}
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}