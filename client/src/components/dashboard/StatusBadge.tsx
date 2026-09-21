import { Badge } from '@/components/ui/badge';
import type { IncidentStatus } from '@/types';

export function StatusBadge({ status }: { status: IncidentStatus }) {
    switch (status) {
        case 'OPEN':
            return <Badge variant="destructive">Новый</Badge>;
        case 'IN_PROGRESS':
            return <Badge variant="default">В работе</Badge>;
        case 'CONFIRMED':
            return <Badge variant="outline" className="border-emerald-500/50 text-emerald-500">Подтвержден</Badge>;
        case 'FALSE_POSITIVE':
            return <Badge variant="secondary" className="text-muted-foreground">Ложная тревога</Badge>;
        default:
            return <Badge variant="secondary">{status}</Badge>;
    }
}