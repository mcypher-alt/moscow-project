import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ResolveIncidentDialogProps {
    incidentId: string;
    onSubmit: (payload: {
        decision: string;
        status: "CONFIRMED" | "FALSE_POSITIVE";
        comment?: string;
    }) => Promise<void> | void;
}

export function ResolveIncidentDialog({
    incidentId,
    onSubmit,
    }: ResolveIncidentDialogProps) {
    const [open, setOpen] = useState(false);
    const [comment, setComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleResolve = async (status: "CONFIRMED" | "FALSE_POSITIVE") => {
        setIsSubmitting(true);
        try {
        await onSubmit({
            decision:
            status === "CONFIRMED"
                ? "Подтверждение аварии"
                : "Ложная тревога",
            status,
            comment:
            comment.trim() ||
            (status === "CONFIRMED"
                ? "Прогноз подтвердился, требуется выезд бригады"
                : "Параметры в норме, ложное срабатывание"),
        });
        setOpen(false);
        setComment("");
        } catch (err) {
        console.error(err);
        } finally {
        setIsSubmitting(false);
        }
    };

    return (
        <>
        {/* Кнопка открытия без проблемного DialogTrigger */}
        <Button
            size="sm"
            onClick={() => setOpen(true)}
            className="h-8 px-3 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm whitespace-nowrap"
        >
            Завершить заявку
        </Button>

        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
                <DialogTitle>Завершение заявки #{incidentId}</DialogTitle>
                <DialogDescription>
                Укажите результат проверки объекта #{incidentId}. Выберите, подтвердился ли прогноз
                предиктивной модели или сработала ложная тревога.
                </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3">
                <label className="text-xs font-medium text-muted-foreground">
                Результат проверки / отчет диспетчера (опционально)
                </label>
                <textarea
                rows={3}
                placeholder="Опишите факт осмотра: показания приборов, состояние оборудования, номер наряда..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full rounded-md border border-input bg-background p-2.5 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[80px] resize-y"
                />
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
                className="text-xs"
                >
                Отмена
                </Button>

                <Button
                type="button"
                variant="secondary"
                disabled={isSubmitting}
                onClick={() => handleResolve("FALSE_POSITIVE")}
                className="text-xs border hover:bg-neutral-800"
                >
                Ложное срабатывание
                </Button>

                <Button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleResolve("CONFIRMED")}
                className="text-xs bg-red-600 hover:bg-red-700 text-white shadow-sm"
                >
                Подтвердить аварию
                </Button>
            </div>
            </DialogContent>
        </Dialog>
        </>
    );
}