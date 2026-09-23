import { useState, useEffect } from "react";
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
import type { IncidentFilters } from "../api";
import { ResolveIncidentDialog } from "../components/ResolveIncidentDialog";

const statusLabels: Record<string, string> = {
  OPEN: "Открыт",
  IN_PROGRESS: "В работе",
  CONFIRMED: "Подтверждён",
  FALSE_POSITIVE: "Ложное срабатывание",
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function DashboardPage() {
  // 1. Состояние фильтров журнала
  const [filters, setFilters] = useState<IncidentFilters>({
    search: "",
    status: undefined,
    dateFrom: "",
    dateTo: "",
  });

  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => ({
        ...prev,
        search: searchInput.trim() || undefined,
      }));
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // 2. Запрос данных
  const {
    incidents,
    isLoading: isIncidentsLoading,
    isFetching: isIncidentsFetching,
    recordAction,
  } = useIncidents(filters);

  const {
    alerts,
    isLoading: isAlertsLoading,
    acknowledge,
  } = useHotAlerts();

  const handleFilterChange = (key: keyof IncidentFilters, value: unknown) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === "" ? undefined : value,
    }));
  };

  const handleResetFilters = () => {
    setSearchInput("");
    setFilters({
      search: undefined,
      status: undefined,
      dateFrom: "",
      dateTo: "",
    });
  };

  // 3. Метрики KPI
  const inProgressIncidents = incidents.filter(
    (incident) => incident.status === "IN_PROGRESS",
  ).length;

  const confirmedIncidents = incidents.filter(
    (incident) => incident.status === "CONFIRMED",
  ).length;

  const falsePositiveIncidents = incidents.filter(
    (incident) => incident.status === "FALSE_POSITIVE",
  ).length;

  // 4. Исключаем статус OPEN из нижнего журнала — новые тревоги отображаются только в верхнем блоке
  const journalIncidents = incidents.filter((incident) => {
    if (filters.status) {
      return incident.status === filters.status;
    }
    return incident.status !== "OPEN";
  });

  return (
    <div className="p-4 md:p-6">
      <main className="mx-auto max-w-[1800px] space-y-6">
        {/* KPI */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Активные прогнозы
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-500">{alerts.length}</div>
              <p className="mt-1 text-xs text-muted-foreground">
                требуют квитирования
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
              <div className="text-3xl font-bold text-blue-500">{inProgressIncidents}</div>
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
              <div className="text-3xl font-bold text-amber-500">{confirmedIncidents}</div>
              <p className="mt-1 text-xs text-muted-foreground">
                подтверждённых аварий
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Ложные срабатывания
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-neutral-400">
                {falsePositiveIncidents}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                параметры в норме
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Карта */}
        <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
          <Card className="min-w-0">
            <CardHeader>
              <CardTitle className="text-lg">Карта объектов</CardTitle>
              <p className="text-sm text-muted-foreground">
                Состояние инженерной инфраструктуры и прогнозируемые риски
              </p>
            </CardHeader>
            <CardContent>
              <ObjectRiskMap />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-lg">
              <CardTitle className="text-lg">Сводка по рискам</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 shrink-0 rounded-full bg-red-500" />
                  <span>Критический риск</span>
                </div>
                <strong>1</strong>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 shrink-0 rounded-full bg-amber-500" />
                  <span>Повышенный риск</span>
                </div>
                <strong>1</strong>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 shrink-0 rounded-full bg-green-500" />
                  <span>Штатное состояние</span>
                </div>
                <strong>2</strong>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Активные прогнозы (Горячий буфер Redis) */}
        <Card className="min-w-0 border-destructive/30">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Активные прогнозы</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Потенциальные инциденты, обнаруженные системой предиктивной аналитики
                </p>
              </div>
              {alerts.length > 0 && (
                <Badge variant="destructive">{alerts.length}</Badge>
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
                <p className="font-medium">Инциденты не прогнозируются</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  На текущем горизонте состояние объектов штатное.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <Table className="min-w-[1150px] table-fixed">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[15%]">Объект</TableHead>
                      <TableHead className="w-[19%]">Инцидент</TableHead>
                      <TableHead className="w-[10%]">Горизонт</TableHead>
                      <TableHead className="w-[21%]">Причина</TableHead>
                      <TableHead className="w-[25%]">Рекомендация</TableHead>
                      <TableHead className="w-[10%] text-right">Действие</TableHead>
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
                          <div className="space-y-1">
                            <div className="flex items-start gap-2">
                              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-500 animate-pulse" />
                              <span className="font-medium text-sm leading-snug break-words">
                                {alert.scenario}
                              </span>
                            </div>

                            {/* Процент вероятности по ТЗ */}
                            {alert.probability != null && (
                              <div className="flex items-center gap-1.5 pl-4">
                                <span className="text-[11px] text-muted-foreground">Вероятность:</span>
                                <Badge variant="outline" className="text-[11px] font-mono text-destructive border-destructive/40 py-0 px-1.5">
                                  {Math.round(alert.probability * 100)}%
                                </Badge>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="align-top font-medium">
                          <span className="whitespace-normal">
                            {alert.horizon}
                          </span>
                        </TableCell>
                        <TableCell className="align-top whitespace-normal break-words">
                          <p className="text-sm leading-relaxed">
                            {alert.reason}
                          </p>
                        </TableCell>
                        <TableCell className="align-top whitespace-normal break-words">
                          <p className="text-sm leading-relaxed text-muted-foreground">
                            {alert.recommendation ?? "—"}
                          </p>
                        </TableCell>
                        <TableCell className="align-top text-right">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="whitespace-nowrap"
                            onClick={() => acknowledge(String(alert.id))}
                          >
                            Квитировать
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

        {/* Журнал инцидентов (Постоянное хранилище PostgreSQL) */}
        <Card className="min-w-0">
          <CardHeader className="space-y-4">
            <div>
              <CardTitle className="text-lg">Журнал инцидентов</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                История принятых в работу инцидентов и результаты их обработки
              </p>
            </div>

            {/* ПАНЕЛЬ ФИЛЬТРОВ */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5 rounded-lg border bg-card/50 p-3 text-sm">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Поиск
                </label>
                <input
                  type="text"
                  placeholder="Сценарий, объект, причина..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Статус
                </label>
                <select
                  value={filters.status || ""}
                  onChange={(e) => handleFilterChange("status", e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">Все обработанные</option>
                  <option value="IN_PROGRESS">В работе</option>
                  <option value="CONFIRMED">Подтверждён</option>
                  <option value="FALSE_POSITIVE">Ложное срабатывание</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Период от
                </label>
                <input
                  type="date"
                  value={filters.dateFrom || ""}
                  onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Период до
                </label>
                <input
                  type="date"
                  value={filters.dateTo || ""}
                  onChange={(e) => handleFilterChange("dateTo", e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetFilters}
                  className="h-9 w-full"
                >
                  Сбросить
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="relative min-h-[300px]">
            {isIncidentsFetching && !isIncidentsLoading && (
              <div className="absolute top-2 right-6 z-10 flex items-center gap-2 rounded-full bg-background/80 px-2.5 py-1 text-xs text-muted-foreground backdrop-blur border shadow-sm">
                <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                Обновление...
              </div>
            )}

            {isIncidentsLoading ? (
              <div className="flex h-48 items-center justify-center">
                <p className="text-sm text-muted-foreground animate-pulse">
                  Загрузка журнала...
                </p>
              </div>
            ) : journalIncidents.length === 0 ? (
              <div className="rounded-lg border p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  По заданным фильтрам записей не найдено.
                </p>
              </div>
            ) : (
              <div
                className={`overflow-x-auto rounded-lg border transition-opacity duration-200 ${
                  isIncidentsFetching ? "opacity-50 pointer-events-none" : "opacity-100"
                }`}
              >
                <Table className="min-w-[1200px] table-fixed">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[8%]">Объект</TableHead>
                      <TableHead className="w-[11%]">Статус</TableHead>
                      <TableHead className="w-[19%]">Инцидент</TableHead>
                      <TableHead className="w-[10%]">Горизонт</TableHead>
                      <TableHead className="w-[21%]">Причина</TableHead>
                      <TableHead className="w-[13%]">Создан</TableHead>
                      <TableHead className="w-[18%] text-right">Действие</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {journalIncidents.map((incident) => (
                      <TableRow key={incident.id}>
                        <TableCell className="align-top font-mono text-sm">
                          #{incident.systemObjectId}
                        </TableCell>

                        <TableCell className="align-top">
                          <Badge
                            variant={
                              incident.status === "CONFIRMED"
                                ? "destructive"
                                : incident.status === "IN_PROGRESS"
                                ? "default"
                                : "secondary"
                            }
                            className="whitespace-normal"
                          >
                            {statusLabels[incident.status] ?? incident.status}
                          </Badge>
                        </TableCell>

                        <TableCell className="align-top whitespace-normal break-words font-medium">
                          {incident.scenario}
                        </TableCell>

                        <TableCell className="align-top whitespace-normal">
                          {incident.horizon}
                        </TableCell>

                        <TableCell className="align-top whitespace-normal break-words text-sm text-muted-foreground">
                          <span className="leading-relaxed">
                            {incident.reason}
                          </span>
                        </TableCell>

                        <TableCell className="align-top whitespace-normal text-xs text-muted-foreground">
                          {formatDate(incident.createdAt)}
                        </TableCell>

                        {/* УСЛОВНЫЙ РЕНДЕРИНГ ДЕЙСТВИЙ */}
                        <TableCell className="align-top text-right">
                          <div className="flex justify-end items-center gap-1.5">
                            {incident.status === "IN_PROGRESS" ? (
                              <>
                                {/* 1. Промежуточная фиксация / черновик наряда */}
                                <RecordActionDialog
                                  incident={incident}
                                  triggerText="Действие"
                                  triggerVariant="outline"
                                  onSubmit={async (payload) => {
                                    await recordAction({
                                      incidentId: incident.id,
                                      payload,
                                    });
                                  }}
                                />

                                {/* 2. Финальное закрытие заявки с вердиктом */}
                                <ResolveIncidentDialog
                                  incidentId={incident.id}
                                  onSubmit={async (payload) => {
                                    await recordAction({
                                      incidentId: incident.id,
                                      payload,
                                    });
                                  }}
                                />
                              </>
                            ) : incident.status === "OPEN" ? (
                              <RecordActionDialog
                                incident={incident}
                                triggerText="Взять в работу"
                                triggerVariant="default"
                                onSubmit={async (payload) => {
                                  await recordAction({
                                    incidentId: incident.id,
                                    payload,
                                  });
                                }}
                              />
                            ) : (
                              <span className="text-xs text-muted-foreground px-2 py-1">
                                Закрыт
                              </span>
                            )}
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