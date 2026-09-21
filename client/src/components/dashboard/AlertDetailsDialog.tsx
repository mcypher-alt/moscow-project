import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { HotAlert } from '@/types';

interface Props {
    alert: HotAlert | null;
    onClose: () => void;
    onAcknowledge: (id: string | number) => void;
    isAcking: boolean;
}

export function AlertDetailsDialog({ alert, onClose, onAcknowledge, isAcking }: Props) {
    return (
        <Dialog open={!!alert} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-1">
                        <Badge variant="destructive" className="font-mono text-xs">
                            {alert?.horizon}
                        </Badge>
                        <span className="text-xs font-mono text-muted-foreground">
                            Объект #{alert?.systemObjectId}
                        </span>
                    </div>
                    <DialogTitle className="text-xl font-bold text-destructive">
                        {alert?.scenario}
                    </DialogTitle>
                    <DialogDescription className="text-foreground font-medium">
                        Подведомственный диспетчер: {alert?.dispatcherName}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 text-sm mt-2">
                    <div className="space-y-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Физическая причина / Датчик-триггер:
                        </span>
                        <div className="bg-muted/70 border border-border p-3 rounded-md text-foreground font-mono text-xs leading-relaxed">
                            {alert?.reason}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Регламентные указания оператору:
                        </span>
                        <div className="bg-muted/70 border border-border p-3 rounded-md text-foreground text-xs leading-relaxed">
                            {alert?.recommendation ?? 'Действовать согласно стандартной инструкции технологического регламента.'}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-2 mt-4">
                    <Button variant="outline" size="sm" onClick={onClose}>
                        Закрыть
                    </Button>
                    <Button
                        variant="destructive"
                        size="sm"
                        disabled={isAcking}
                        onClick={() => alert && onAcknowledge(alert.id)}
                    >
                        Квитировать сигнал
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}