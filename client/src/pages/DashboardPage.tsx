import { useEffect, useRef } from 'react';
import { useLocation, useSearchParams } from 'react-router';
import { MaintenanceDialog } from '../components/MaintenanceDialog';
import { useObjects, objectRisk, useSummary } from "../hooks/useObjects";
import { useAuth } from "../hooks/useDispatcher";
import { ObjectRiskMap } from "../components/ObjectRiskMap";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useIncidents, useHotAlerts } from "../hooks/useDispatcher";
import { RecordActionDialog } from "../components/RecordActionDialog";

const statusLabels: Record<string, string> = {
  RESOLVED: "Устранён",
  OPEN: "Открыт",
  IN_PROGRESS: "В работе",
  CONFIRMED: "Подтверждён",
  FALSE_POSITIVE: "Ложное срабатывание",
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DashboardPage() {
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const incidentsSection = useRef<HTMLDivElement>(null);
  const searchField = useRef<HTMLInputElement>(null);
  const search = params.get('search') || '';
  const objectId = Number(params.get('objectId')) || undefined;
  const filters = { search: search || undefined, systemObjectId: objectId, status: params.get('status') || undefined,
    dateFrom: params.get('dateFrom') || undefined, dateTo: params.get('dateTo') || undefined };
  const changeFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    next.delete('objectId');
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  };
  const objects = useObjects();
  const summary = useSummary();
  const { user } = useAuth();
  const dataTimes = (objects.data ?? []).flatMap(item => item.forecasts?.[0] ? [Date.parse(item.forecasts[0].evaluatedAt)] : []);
  const latestData = dataTimes.length ? new Date(Math.max(...dataTimes)).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' }) + ' МСК' : 'нет данных';
  const canAct = user?.role === 'ADMIN' || user?.role === 'DISPATCHER';
  const counts = (risk: string) => objects.data?.filter(item => objectRisk(item) === risk).length ?? 0;

  const {
    incidents,
    isLoading: isIncidentsLoading,
    isError: incidentsError,
    recordAction,
  } = useIncidents(filters);

  const {
    alerts,
    isLoading: isAlertsLoading,
    isError: alertsError,
    acknowledge,
  } = useHotAlerts();

  useEffect(() => {
    if ((!objectId && location.hash !== '#incidents') || isIncidentsLoading || isAlertsLoading) return;
    incidentsSection.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    searchField.current?.focus({ preventScroll: true });
  }, [location.key, location.hash, objectId, isIncidentsLoading, isAlertsLoading]);

  const statusCount = (status: string) => summary.data?.find(row => row.status === status)?._count._all ?? 0;
  const openIncidents = statusCount('OPEN');
  const inProgressIncidents = statusCount('IN_PROGRESS');
  const confirmedIncidents = statusCount('CONFIRMED');

  if (incidentsError || alertsError || objects.isError) return <p role="alert" className="p-6">Не удалось загрузить данные. Проверьте соединение и повторите попытку.</p>;
  return (
    <div className="p-4 md:p-6">
      <main className="mx-auto max-w-[1800px] space-y-6">
        <p className="px-6 text-sm text-muted-foreground">Последние данные прогноза: {latestData}. Исторические данные не отражают текущее состояние оборудования.</p>
        {/* KPI */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Активные прогнозы
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="text-3xl font-bold">{openIncidents + inProgressIncidents}</div>

              <p className="mt-1 text-xs text-muted-foreground">
                требуют внимания диспетчера
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Открытые инциденты
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="text-3xl font-bold">{openIncidents}</div>

              <p className="mt-1 text-xs text-muted-foreground">
                ожидают обработки
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                В работе
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="text-3xl font-bold">
                {inProgressIncidents}
              </div>

              <p className="mt-1 text-xs text-muted-foreground">
                проверяются диспетчерами
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Подтверждено
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="text-3xl font-bold">
                {confirmedIncidents}
              </div>

              <p className="mt-1 text-xs text-muted-foreground">
                подтверждённых прогнозов
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Карта */}
        <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle className="text-lg">
                Карта объектов
              </CardTitle>

              <p className="text-sm text-muted-foreground">
                Состояние инженерной инфраструктуры и прогнозируемые риски
              </p>
            </CardHeader>

            <CardContent>
              <ObjectRiskMap />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Сводка по рискам
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 shrink-0 rounded-full bg-red-500" />
                  <span>Требует проверки</span>
                </div>

                <strong>{counts("critical")}</strong>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 shrink-0 rounded-full bg-amber-500" />
                  <span>Повышенный риск</span>
                </div>

                <strong>{counts("warning")}</strong>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 shrink-0 rounded-full bg-green-500" />
                  <span>Ниже порога модели</span>
                </div>

                <strong>{counts("normal")}</strong>
              </div>
              <p>Нет актуального прогноза: {counts("unknown")}</p>
            </CardContent>
          </Card>
        </section>

        {/* Активные прогнозы */}
        <Card className="min-w-0 border-destructive/30">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle className="text-lg">
                  Активные прогнозы
                </CardTitle>

                <p className="mt-1 text-sm text-muted-foreground">
                  Потенциальные инциденты, обнаруженные системой предиктивной
                  аналитики
                </p>
              </div>

              {alerts.length > 0 && (
                <Badge variant="destructive">
                  {alerts.length}
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent>
            {isAlertsLoading ? (
              <p className="text-sm text-muted-foreground">
                Получение прогнозов...
              </p>
            ) : alerts.length === 0 ? (
              <div className="rounded-lg border border-border p-8 text-center">
                <p className="font-medium">
                  Активных предупреждений нет
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  Проверьте актуальность данных и прогнозы объектов.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <Table className="min-w-[1150px] table-fixed">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[15%]">
                        Объект
                      </TableHead>

                      <TableHead className="w-[19%]">
                        Инцидент
                      </TableHead>

                      <TableHead className="w-[10%]">
                        Горизонт
                      </TableHead>

                      <TableHead className="w-[21%]">
                        Причина
                      </TableHead>

                      <TableHead className="w-[25%]">
                        Рекомендация
                      </TableHead>

                      <TableHead className="w-[10%] text-right">
                        Действие
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {alerts.map((alert) => (
                      <TableRow key={alert.id}>
                        <TableCell className="align-top">
                          <div className="break-words font-medium">
                            {alert.dispatcherName}
                          </div>

                          <div className="mt-1 text-xs text-muted-foreground">
                            Объект #{alert.systemObjectId}
                          </div>
                        </TableCell>

                        <TableCell className="align-top whitespace-normal">
                          <Badge
                            variant="destructive"
                            className="h-auto min-h-5 max-w-full whitespace-normal break-words rounded-lg text-left leading-snug"
                          >
                            {alert.scenario}
                          </Badge>
                        </TableCell>

                        <TableCell className="align-top font-medium">
                          <span className="whitespace-normal">
                            {alert.horizon} • {alert.probability == null ? "—" : `(${alert.probability.toFixed(1)}%)`}
                          </span>
                        </TableCell>

                        <TableCell className="align-top whitespace-normal break-words">
                          <p className="text-sm leading-relaxed">
                            {alert.reason}
                          </p>
                        </TableCell>

                        <TableCell className="align-top whitespace-normal break-words">
                          <div className="text-sm leading-relaxed text-muted-foreground">
                            {alert.recommendation ?? "—"}<div className="mt-2"><MaintenanceDialog objectId={alert.systemObjectId} /></div>
                          </div>
                        </TableCell>

                        <TableCell className="align-top text-right">
                          <Button
                            disabled={!canAct}
                            size="sm"
                            variant="secondary"
                            className="h-auto whitespace-normal text-center"
                            onClick={() =>
                              acknowledge(String(alert.id))
                            }
                          >
                            Принять в работу
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Журнал */}
        <Card ref={incidentsSection} id="incidents" className="min-w-0 scroll-mt-24">
          <CardHeader>
            <div>
              <CardTitle className="text-lg">
                Журнал инцидентов
              </CardTitle>

              <p className="mt-1 text-sm text-muted-foreground">
                История прогнозов и результаты их обработки
              </p>
            </div>
          </CardHeader>

          <CardContent>
            <div className="mb-4 flex flex-wrap gap-3">
              <input ref={searchField} aria-label="Поиск инцидентов" className="min-w-60 rounded border bg-background p-2 text-foreground" placeholder="Объект, сценарий или причина" value={search} onChange={e => changeFilter('search', e.target.value)} />
              <select aria-label="Статус инцидента" className="rounded border p-2" value={filters.status || ''} onChange={e => changeFilter('status', e.target.value)}><option value="">Все статусы</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
              <label>С <input type="date" value={filters.dateFrom?.slice(0,10) || ''} onChange={e => changeFilter('dateFrom', e.target.value ? `${e.target.value}T00:00:00+03:00` : '')} /></label>
              <label>По <input type="date" value={filters.dateTo?.slice(0,10) || ''} onChange={e => changeFilter('dateTo', e.target.value ? `${e.target.value}T23:59:59.999+03:00` : '')} /></label>
              <Button variant="outline" onClick={() => setParams({})}>Сбросить фильтры</Button>
            </div>
            {isIncidentsLoading ? (
              <p className="text-sm text-muted-foreground">
                Загрузка журнала...
              </p>
            ) : incidents.length === 0 ? (
              <div className="rounded-lg border p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  В журнале пока нет записей.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <Table className="min-w-[1200px] table-fixed">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[8%]">
                        Объект
                      </TableHead>

                      <TableHead className="w-[11%]">
                        Статус
                      </TableHead>

                      <TableHead className="w-[19%]">
                        Инцидент
                      </TableHead>

                      <TableHead className="w-[10%]">
                        Горизонт
                      </TableHead>

                      <TableHead className="w-[23%]">
                        Причина
                      </TableHead>

                      <TableHead className="w-[13%]">
                        Создан
                      </TableHead>

                      <TableHead className="w-[16%] text-right">
                        Действие
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {incidents.map((incident) => (
                      <TableRow key={incident.id} className={objectId === incident.systemObjectId ? "bg-primary/10" : undefined}>
                        <TableCell className="align-top font-mono text-sm">
                          #{incident.systemObjectId}
                        </TableCell>

                        <TableCell className="align-top">
                          <Badge
                            variant={
                              incident.status === "OPEN"
                                ? "destructive"
                                : "secondary"
                            }
                            className="whitespace-normal"
                          >
                            {statusLabels[incident.status] ??
                              incident.status}
                          </Badge>
                        </TableCell>

                        <TableCell className="align-top whitespace-normal break-words font-medium">
                          {incident.scenario}
                        </TableCell>

                        <TableCell className="align-top whitespace-normal">
                          {incident.horizon} • {incident.probability == null ? "—" : `(${incident.probability.toFixed(1)}%)`}
                        </TableCell>

                        <TableCell className="align-top whitespace-normal break-words text-sm text-muted-foreground">
                          <span className="leading-relaxed">
                            {incident.reason}
                          </span>
                        </TableCell>

                        <TableCell className="align-top whitespace-normal text-xs text-muted-foreground">
                          {formatDate(incident.createdAt)}
                        </TableCell>

                        <TableCell className="align-top text-right">
                          <div className="flex justify-end">
                            <RecordActionDialog
                              disabled={!canAct || incident.status === 'FALSE_POSITIVE' || incident.status === 'RESOLVED'}
                              incident={incident}
                              incidentId={incident.id}
                              onSubmit={(payload) =>
                                recordAction({
                                  incidentId: incident.id,
                                  payload,
                                })
                              }
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
