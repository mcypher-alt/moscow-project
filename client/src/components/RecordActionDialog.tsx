import { useState, useMemo } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { Incident, RecordActionPayload } from '../types';

interface Props {
    incidentId?: string;
    incident?: Incident;
    onSubmit: (payload: RecordActionPayload) => Promise<unknown>;
    disabled?: boolean;
}

const ACTION_PRESETS = [
    { value: 'SITE_VISIT', label: 'Выезд на объект' },
    { value: 'INSPECTION_COMPLETED', label: 'Осмотр выполнен (записать результат)' },
    { value: 'MONITORING', label: 'Продолжить мониторинг' },
    { value: 'MAINTENANCE_SCHEDULED', label: 'Назначить профилактическое обслуживание' },
    { value: 'REPAIR_COMPLETED', label: 'Ремонт завершён — закрыть' },
    { value: 'OTHER', label: 'Другое (описать результат)' },
    { value: 'CONFIRM_INCIDENT', label: 'Подтверждённый инцидент' },
    { value: 'FALSE_ALARM', label: 'Ложное срабатывание' },
    { value: 'DISPATCH_EMERGENCY_TEAM', label: 'Аварийный выезд дежурной бригады (АВБ)' },
    { value: 'EQUIPMENT_SHUTDOWN', label: 'Аварийное отключение / локализация узла' },
    { value: 'REMOTE_DIAGNOSTICS', label: 'Дистанционная перекалибровка и мониторинг' },
    { value: 'INSPECTION_SCHEDULED', label: 'Включение в план ближайшего техобслуживания' },
];

export function RecordActionDialog({ incidentId, incident, onSubmit, disabled }: Props) {
    const [open, setOpen] = useState(false);
    const [decision, setDecision] = useState('MONITORING');
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [reasonCode, setReasonCode] = useState('SENSOR_CHECK');
    const [error, setError] = useState('');

    const effectiveId = useMemo(
        () => incident?.id || incidentId || '',
        [incident, incidentId]
    );

    const handleOpenChange = (nextOpen: boolean) => {
        setOpen(nextOpen);
        if (nextOpen) { setComment(''); setError(''); }
    };

    const handleDecisionChange = (newDecision: string | undefined) => {
        if (newDecision) setDecision(newDecision);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!decision.trim()) return;
        if (['OTHER', 'INSPECTION_COMPLETED', 'REPAIR_COMPLETED'].includes(decision) && !comment.trim()) {
            setError('Опишите фактический результат проверки или ремонта.'); return;
        }

        setLoading(true);
        setError('');
        try {
            await onSubmit({
                decision,
                reasonCode,
                comment,
                timestamp: new Date().toISOString(),
            });
            setOpen(false);
        } catch {
            setError('Не удалось сохранить действие. Повторите попытку.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger
                className={buttonVariants({ variant: 'outline', size: 'sm' })}
                disabled={disabled}
            >
                Зафиксировать действие
            </DialogTrigger>
            <DialogContent className="sm:max-w-[560px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Регистрация действия диспетчера</DialogTitle>
                        <DialogDescription>
                            Инцидент #{effectiveId.slice(0, 8)}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="action-decision">Принимаемое оперативное решение</Label>
                            <Select value={decision} onValueChange={(val) => {
                                if (val) handleDecisionChange(val);
                            }}>
                                <SelectTrigger id="action-decision">
                                    <SelectValue placeholder="Выберите действие">{ACTION_PRESETS.find(preset => preset.value === decision)?.label}</SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {ACTION_PRESETS.map((preset) => (
                                        <SelectItem key={preset.value} value={preset.value}>
                                            {preset.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="action-comment">Результат проверки / Комментарий</Label>

                            </div>
                            <Textarea
                                id="action-comment"
                                rows={9}
                                className="font-mono text-xs leading-relaxed"
                                placeholder="Наблюдения, измерения, выполненные действия и результат..."
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid gap-2 pb-4"><Label htmlFor="action-reason">Основание решения</Label>
                    <select id="action-reason" className="rounded border bg-background p-2" value={reasonCode} onChange={e => setReasonCode(e.target.value)}>
                      <option value="SENSOR_CHECK">Проверка показаний</option><option value="VIDEO_CHECK">Видеопроверка</option>
                      <option value="PLANNED_WORK">Плановые работы</option><option value="SITE_INSPECTION">Осмотр на объекте</option><option value="OTHER">Другое</option>
                    </select>{error && <p role="alert">{error}</p>}</div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                            Отмена
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Регистрация...' : 'Сохранить решение'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
