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
    triggerText?: string;
    triggerVariant?: 'default' | 'outline' | 'secondary' | 'ghost';
}

const ACTION_PRESETS = [
    { value: 'DISPATCH_EMERGENCY_TEAM', label: 'Аварийный выезд дежурной бригады (АВБ)' },
    { value: 'EQUIPMENT_SHUTDOWN', label: 'Аварийное отключение / локализация узла' },
    { value: 'REMOTE_DIAGNOSTICS', label: 'Дистанционная перекалибровка и мониторинг' },
    { value: 'INSPECTION_SCHEDULED', label: 'Включение в план ближайшего техобслуживания' },
];

export function RecordActionDialog({
    incidentId,
    incident,
    onSubmit,
    disabled,
    triggerText = 'Зафиксировать действие',
    triggerVariant = 'outline',
}: Props) {
    const [open, setOpen] = useState(false);
    const [decision, setDecision] = useState('DISPATCH_EMERGENCY_TEAM');
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);

    const effectiveId = useMemo(
        () => incident?.id || incidentId || '',
        [incident, incidentId]
    );

    // Функция формирования текста наряда-задания
    const generateDraftOrder = (currentDecision: string) => {
        const actionLabel =
            ACTION_PRESETS.find((p) => p.value === currentDecision)?.label || currentDecision;

        if (!incident) {
            return [
                `НАРЯД-ЗАДАНИЕ ПО ИНЦИДЕНТУ #${effectiveId.slice(0, 8).toUpperCase()}`,
                `• Решение диспетчера: ${actionLabel}`,
                `• Время регистрации: ${new Date().toLocaleString()}`,
                `• Примечание: Провести оперативную проверку узла.`,
            ].join('\n');
        }

        const objectLabel = incident.systemObject?.dispatcherName
            ? `${incident.systemObject.dispatcherName} (Объект #${incident.systemObjectId})`
            : `Объект #${incident.systemObjectId}`;

        return [
            `НАРЯД-ЗАДАНИЕ № ${incident.id.slice(0, 8).toUpperCase()}`,
            `• Подведомственный узел: ${objectLabel}`,
            `• Прогнозируемая авария: ${incident.scenario}`,
            `• Расчетный горизонт развития: ${incident.horizon}`,
            `• Зафиксированный фактор-триггер: ${incident.reason}`,
            `• Предписанный регламент: ${incident.recommendation || 'Согласно типовой технологической карте объекта'}`,
            `• Принятое решение: ${actionLabel}`,
            `• Указание диспетчера: Бригаде выехать на объект со штатным комплектом приборов. Соблюдать регламент ТБ.`,
        ].join('\n');
    };

    // Заполняем черновик только при явном открытии диалога
    const handleOpenChange = (nextOpen: boolean) => {
        setOpen(nextOpen);
        if (nextOpen) {
            setComment(generateDraftOrder(decision));
        }
    };

    // Обновляем черновик при выборе другого решения в Select
    const handleDecisionChange = (newDecision: string | undefined) => {
        if (!newDecision) return;
        setDecision(newDecision);
        setComment(generateDraftOrder(newDecision));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!decision.trim()) return;

        setLoading(true);
        try {
            await onSubmit({
                decision,
                comment,
                timestamp: new Date().toISOString(),
            });
            setOpen(false);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger
                className={buttonVariants({ variant: triggerVariant, size: 'sm' })}
                disabled={disabled}
            >
                {triggerText}
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
                            <Select 
                                value={decision} 
                                onValueChange={(val) => {
                                    if (val) handleDecisionChange(val);
                                }}
                            >
                                {/* 1. Даем триггеру автовысоту и отключаем обрезку line-clamp */}
                                <SelectTrigger 
                                    id="action-decision" 
                                    className="h-auto min-h-10 py-2.5 text-left whitespace-normal leading-snug [&>span]:line-clamp-none"
                                >
                                    <SelectValue placeholder="Выберите действие" />
                                </SelectTrigger>

                                {/* 2. Контенту задаем полную ширину триггера */}
                                <SelectContent className="w-[var(--radix-select-trigger-width)]">
                                    {ACTION_PRESETS.map((preset) => (
                                        /* 3. Элементам списка разрешаем перенос строк (whitespace-normal) */
                                        <SelectItem 
                                            key={preset.value} 
                                            value={preset.value}
                                            className="py-2.5 text-xs sm:text-sm whitespace-normal leading-snug cursor-pointer"
                                        >
                                            {preset.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="action-comment">Черновик наряда / Комментарий</Label>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-xs text-muted-foreground hover:text-foreground"
                                    onClick={() => setComment(generateDraftOrder(decision))}
                                >
                                    Сбросить к черновику
                                </Button>
                            </div>
                            <Textarea
                                id="action-comment"
                                rows={9}
                                className="font-mono text-xs leading-relaxed"
                                placeholder="Текст наряда или комментарий..."
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                            Отмена
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Регистрация...' : 'Утвердить и отправить'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}