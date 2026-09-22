import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface Forecast {
    id: string;
    objectId: number;
    objectName: string;
    incidentType: string;
    horizon: string;
    reason: string;
    recommendation: string;
    status: 'ACTIVE' | 'IN_PROGRESS' | 'CONFIRMED' | 'FALSE_POSITIVE';
}

const forecasts: Forecast[] = [
    {
        id: 'forecast-1',
        objectId: 5122,
        objectName: 'ДУ объект Альфа',
        incidentType: 'Перегрев подшипника насоса',
        horizon: '24–48 часов',
        reason: 'Резкий рост вибрации на фоне падения давления масла',
        recommendation: 'Остановить агрегат на ТО и направить дежурную бригаду',
        status: 'ACTIVE',
    },
    {
        id: 'forecast-2',
        objectId: 3814,
        objectName: 'Коллектор №3814',
        incidentType: 'Повышенный пожарный риск',
        horizon: '24 часа',
        reason: 'Аномальный рост температуры в кабельном отсеке',
        recommendation: 'Проверить кабельную линию и вентиляцию отсека',
        status: 'IN_PROGRESS',
    },
];

const statusLabels: Record<Forecast['status'], string> = {
    ACTIVE: 'Активный',
    IN_PROGRESS: 'В работе',
    CONFIRMED: 'Подтверждён',
    FALSE_POSITIVE: 'Ложное срабатывание',
};

export function ForecastsPage() {
    const [search, setSearch] = useState('');

    const filtered = useMemo(() => {
        const query = search.trim().toLowerCase();

        if (!query) return forecasts;

        return forecasts.filter((forecast) =>
            [
                forecast.objectName,
                String(forecast.objectId),
                forecast.incidentType,
                forecast.horizon,
                forecast.reason,
                forecast.recommendation,
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
                    Прогнозы
                </h1>

                <p className="mt-1 text-sm text-muted-foreground">
                    Прогнозируемые инциденты и рекомендации системы
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">
                        Поиск прогнозов
                    </CardTitle>
                </CardHeader>

                <CardContent>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                        <Input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Объект, инцидент, причина или рекомендация"
                            className="pl-9"
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-4">
                {filtered.map((forecast) => (
                    <Card key={forecast.id}>
                        <CardHeader>
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <CardTitle className="text-lg">
                                        {forecast.incidentType}
                                    </CardTitle>

                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {forecast.objectName} · объект #{forecast.objectId}
                                    </p>
                                </div>

                                <Badge
                                    variant={
                                        forecast.status === 'ACTIVE'
                                            ? 'destructive'
                                            : 'secondary'
                                    }
                                >
                                    {statusLabels[forecast.status]}
                                </Badge>
                            </div>
                        </CardHeader>

                        <CardContent className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                            <div>
                                <p className="text-xs text-muted-foreground">
                                    Горизонт
                                </p>
                                <p className="mt-1 font-medium">
                                    {forecast.horizon}
                                </p>
                            </div>

                            <div>
                                <p className="text-xs text-muted-foreground">
                                    Причина
                                </p>
                                <p className="mt-1 text-sm">
                                    {forecast.reason}
                                </p>
                            </div>

                            <div className="md:col-span-2">
                                <p className="text-xs text-muted-foreground">
                                    Рекомендация
                                </p>
                                <p className="mt-1 text-sm">
                                    {forecast.recommendation}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {filtered.length === 0 && (
                <Card>
                    <CardContent className="p-8 text-center text-sm text-muted-foreground">
                        Прогнозы не найдены.
                    </CardContent>
                </Card>
            )}
        </div>
    );
}