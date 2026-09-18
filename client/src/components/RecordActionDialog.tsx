import { useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { RecordActionPayload } from '../types';

interface Props {
    incidentId: string;
    onSubmit: (payload: RecordActionPayload) => Promise<unknown>;
    disabled?: boolean;
}

export function RecordActionDialog({ incidentId, onSubmit, disabled }: Props) {
    const [open, setOpen] = useState(false);
    const [actionType, setActionType] = useState('');
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!actionType.trim()) return;

        setLoading(true);
        try {
            await onSubmit({
                decision: actionType,
                comment,
                timestamp: new Date().toISOString(),
            });
            setOpen(false);
            setActionType('');
            setComment('');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger 
                className={buttonVariants({ variant: "outline", size: "sm" })} 
                disabled={disabled}
            >
                Зафиксировать действие
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Регистрация действия диспетчера</DialogTitle>
                        <DialogDescription>Инцидент #{incidentId.slice(0, 8)}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Тип действия</label>
                            <Input
                                placeholder="Например: ПЕРЕКРЫТИЕ_ЗАСЛОНКИ"
                                value={actionType}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setActionType(e.target.value)}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Комментарий / Причина</label>
                            <Textarea
                                placeholder="Краткое описание принятых мер..."
                                value={comment}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setComment(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                            Отмена
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Запись...' : 'Сохранить'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}