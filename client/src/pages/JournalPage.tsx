import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

type JournalStatus =
    | 'OPEN'
    | 'IN_PROGRESS'
    | 'CONFIRMED'
    | 'FALSE_POSITIVE';

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

const entries: JournalEntry[] = [
    {
        id: 'INC-001',
        objectId: 5122,
        objectName: 'ДУ объект Альфа',
        incident: 'Перегрев подшипника насоса',
        status: 'OPEN',
        createdAt: '2026-09-22T10:30:00',
        horizon: '24–48 часов',
        result: 'Ожидает обработки диспетчером',
    },
    {
        id: 'INC-002',
        objectId: 3814,
        objectName: 'Коллектор №3814',
        incident: 'Повышенный пожарный риск',
        status: 'IN_PROGRESS',
        createdAt: '2026-09-22T09:15:00',
        horizon: '24 часа',
        result: 'Направлена заявка на проверку',
    },
    {
        id: 'INC-003',
        objectId: 4201,
        objectName: 'Коллектор №4201',
        incident: 'Неисправность температурного датчика',
        status: 'CONFIRMED',
        createdAt: '2026-09-21T17:40:00',
        horizon: '48 часов',
        result: 'Неисправность подтверждена',
    },
    {
        id: 'INC-004',
        objectId: 2760,
        objectName: 'Коллектор №2760',
        incident: 'Аномалия датчика доступа',
        status: 'FALSE_POSITIVE',
        createdAt: '2026-09-21T12:10:00',
        horizon: '24 часа',
        result: 'Ложное срабатывание',
    },
];

const labels: Record<JournalStatus, string> = {
    OPEN: 'Открыт',
    IN_PROGRESS: 'В работе',
    CONFIRMED: 'Подтверждён',
    FALSE_POSITIVE: 'Ложный',
};

export function JournalPage() {
    const [search, setSearch] = useState('');

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
    }, [search]);

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
                                            ).toLocaleString('ru-RU')}
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