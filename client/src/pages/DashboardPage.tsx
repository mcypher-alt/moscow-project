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
  const {
    incidents,
    isLoading: isIncidentsLoading,
    recordAction,
  } = useIncidents();

  const {
    alerts,
    isLoading: isAlertsLoading,
    acknowledge,
  } = useHotAlerts();

  const openIncidents = incidents.filter(
    (incident) => incident.status === "OPEN",
  ).length;

  const inProgressIncidents = incidents.filter(
    (incident) => incident.status === "IN_PROGRESS",
  ).length;

  const confirmedIncidents = incidents.filter(
    (incident) => incident.status === "CONFIRMED",
  ).length;

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
              <div className="text-3xl font-bold">{alerts.length}</div>

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
                  Инциденты не прогнозируются
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  На текущем горизонте состояние объектов штатное.
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
                            className="max-w-full whitespace-normal break-words text-left leading-snug"
                          >
                            {alert.scenario}
                          </Badge>
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
                            onClick={() =>
                              acknowledge(String(alert.id))
                            }
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

        {/* Журнал */}
        <Card className="min-w-0">
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
                      <TableRow key={incident.id}>
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

                        <TableCell className="align-top text-right">
                          <div className="flex justify-end">
                            <RecordActionDialog
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