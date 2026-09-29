import { MaintenanceDialog } from '../components/MaintenanceDialog';
import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

import { useForecasts } from '../hooks/useObjects';

export function ForecastsPage() {
    const [search, setSearch] = useState('');
    const [offset, setOffset] = useState(0);
    const query = useForecasts(offset);
    const forecasts = useMemo(() => (query.data ?? []).map(item => ({
        id: item.id, objectId: item.systemObjectId, objectName: item.systemObject?.dispatcherName ?? String(item.systemObjectId),
        incidentType: item.scenario, horizon: `${item.horizonHours} часа`, reason: item.reason,
        recommendation: item.recommendation, status: item.isIncidentPredicted ? 'ACTIVE' : 'BELOW_THRESHOLD',
        probability: item.probability, threshold: item.threshold, evaluatedAt: item.evaluatedAt, modelVersion: item.modelVersion,
    })), [query.data]);

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
    }, [search, forecasts]);

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

            <p className="text-sm text-muted-foreground">Модель прогнозирует тревожное событие в следующие 24 часа; тип и физическая причина инцидента не установлены.</p>
            {query.isLoading && <p role="status">Загрузка прогнозов…</p>}
            {query.isError && <p role="alert">Не удалось загрузить прогнозы.</p>}
            <div className="flex gap-4"><button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 100))}>Назад</button><span>Записи {offset + 1}–{offset + forecasts.length}</span><button disabled={forecasts.length < 100} onClick={() => setOffset(offset + 100)}>Далее</button></div>
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
                                        {forecast.objectName} · объект #{forecast.objectId} · {new Date(forecast.evaluatedAt).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" }) + " МСК"}
                                        <br />Модель: {forecast.modelVersion}
                                        <br />Порог предупреждения: {forecast.threshold.toFixed(1)}%
                                    </p>
                                </div>

                                <Badge
                                    variant={
                                        forecast.status === 'ACTIVE'
                                            ? 'destructive'
                                            : 'secondary'
                                    }
                                >
                                    {forecast.status === 'ACTIVE' ? 'Выше порога' : 'Ниже порога'} ({forecast.probability.toFixed(1)}%)
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
                                    {forecast.recommendation}<div className="mt-2"><MaintenanceDialog objectId={forecast.objectId} /></div>
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
