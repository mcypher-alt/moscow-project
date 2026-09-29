import { decisionLabels, reasonLabels } from '../lib/decisions';
import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

import { useIncidents } from '../hooks/useDispatcher';

type JournalStatus =
    | 'OPEN'
    | 'IN_PROGRESS'
    | 'CONFIRMED'
    | 'FALSE_POSITIVE'
    | 'RESOLVED';

interface JournalEntry {
    id: string;
    objectId: number;
    objectName: string;
    incident: string;
    status: JournalStatus;
    createdAt: string;
    horizon: string;
    result: string;
}

const labels: Record<JournalStatus, string> = {
    RESOLVED: 'Устранён',
    OPEN: 'Открыт',
    IN_PROGRESS: 'В работе',
    CONFIRMED: 'Подтверждён',
    FALSE_POSITIVE: 'Ложный',
};

export function JournalPage() {
    const [search, setSearch] = useState('');
    const [offset, setOffset] = useState(0);
    const { incidents, isLoading, isError } = useIncidents(offset);
    const entries: JournalEntry[] = useMemo(() => incidents.map(item => ({
        id: item.id, objectId: item.systemObjectId, objectName: item.systemObject?.dispatcherName ?? String(item.systemObjectId),
        incident: item.scenario, status: item.status, createdAt: item.createdAt, horizon: item.horizon,
        result: item.actions?.map(action => `${new Date(action.createdAt).toLocaleString("ru-RU")} · ${decisionLabels[action.decision] ?? action.decision} (${reasonLabels[action.reasonCode ?? ""] ?? action.reasonCode ?? "—"}) · ${action.userId}: ${action.comment ?? ''}`).join('; ') || 'Ожидает обработки диспетчером',
    })), [incidents]);

    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase();

        if (!query) return entries;

        return entries.filter((entry) =>
            [
                entry.id,
                entry.objectName,
                String(entry.objectId),
                entry.incident,
                entry.status,
                entry.result,
            ]
                .join(' ')
                .toLowerCase()
                .includes(query)
        );
    }, [search, entries]);

    if (isLoading) return <p className="p-6" role="status">Загрузка журнала…</p>;
    if (isError) return <p className="p-6" role="alert">Не удалось загрузить журнал.</p>;
    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="text-2xl font-bold">
                    Журнал событий
                </h1>

                <p className="mt-1 text-sm text-muted-foreground">
                    История прогнозов и результатов их обработки
                </p>
            </div>

            <div className="flex gap-4"><button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 100))}>Назад</button><span>Записи {offset + 1}–{offset + entries.length}</span><button disabled={entries.length < 100} onClick={() => setOffset(offset + 100)}>Далее</button></div>
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">
                        Поиск по журналу
                    </CardTitle>
                </CardHeader>

                <CardContent>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="ID, объект, инцидент или результат"
                            className="pl-9"
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="border-b">
                                <tr className="text-left">
                                    <th className="p-4">ID</th>
                                    <th className="p-4">Объект</th>
                                    <th className="p-4">Инцидент</th>
                                    <th className="p-4">Горизонт</th>
                                    <th className="p-4">Статус</th>
                                    <th className="p-4">Создан</th>
                                    <th className="p-4">Результат</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filtered.map((entry) => (
                                    <tr
                                        key={entry.id}
                                        className="border-b last:border-0"
                                    >
                                        <td className="p-4 font-mono">
                                            {entry.id}
                                        </td>

                                        <td className="p-4">
                                            <div className="font-medium">
                                                {entry.objectName}
                                            </div>

                                            <div className="text-xs text-muted-foreground">
                                                #{entry.objectId}
                                            </div>
                                        </td>

                                        <td className="p-4">
                                            {entry.incident}
                                        </td>

                                        <td className="p-4 whitespace-nowrap">
                                            {entry.horizon}
                                        </td>

                                        <td className="p-4">
                                            <Badge
                                                variant={
                                                    entry.status === 'OPEN'
                                                        ? 'destructive'
                                                        : 'secondary'
                                                }
                                            >
                                                {labels[entry.status]}
                                            </Badge>
                                        </td>

                                        <td className="p-4 whitespace-nowrap text-muted-foreground">
                                            {new Date(
                                                entry.createdAt
                                            ).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' }) + ' МСК'}
                                        </td>

                                        <td className="p-4">
                                            {entry.result}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {filtered.length === 0 && (
                <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                        Записи не найдены.
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
