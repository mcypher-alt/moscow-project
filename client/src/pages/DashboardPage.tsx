import { ObjectRiskMap } from "../components/ObjectRiskMap";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth, useIncidents, useHotAlerts } from "../hooks/useDispatcher";
import { RecordActionDialog } from "../components/RecordActionDialog";

const statusLabels: Record<string, string> = {
  OPEN: "Открыт",
  IN_PROGRESS: "В работе",
  CONFIRMED: "Подтверждён",
  FALSE_POSITIVE: "Ложное срабатывание",
};

export function DashboardPage() {
  const { user, logout } = useAuth();

  const {
    incidents,
    isLoading: isIncidentsLoading,
    recordAction,
  } = useIncidents();

  const { alerts, isLoading: isAlertsLoading, acknowledge } = useHotAlerts();

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
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Центр предиктивного мониторинга
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              Инженерные коллекторы АО «Москоллектор»
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">{user?.name ?? "Диспетчер"}</p>

              <p className="text-xs text-muted-foreground">
                {user?.role ?? ""}
              </p>
            </div>

            <ThemeToggle />

            <Button variant="outline" size="sm" onClick={() => logout()}>
              Завершить смену
            </Button>
          </div>
        </div>
      </header>

      <main className="space-y-6 p-6">
        {/* KPI */}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
              <div className="text-3xl font-bold">{inProgressIncidents}</div>

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
              <div className="text-3xl font-bold">{confirmedIncidents}</div>

              <p className="mt-1 text-xs text-muted-foreground">
                подтверждённых прогнозов
              </p>
            </CardContent>
          </Card>
        </section>
        <section className="grid gap-6 xl:grid-cols-[2fr_1fr]">
          <Card>
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
            <CardHeader>
              <CardTitle className="text-lg">Сводка по рискам</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full bg-red-500" />
                  <span>Критический риск</span>
                </div>
                <strong>1</strong>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full bg-amber-500" />
                  <span>Повышенный риск</span>
                </div>
                <strong>1</strong>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full bg-green-500" />
                  <span>Штатное состояние</span>
                </div>
                <strong>2</strong>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Активные прогнозы */}
        <Card className="border-destructive/30">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Активные прогнозы</CardTitle>

                <p className="mt-1 text-sm text-muted-foreground">
                  Потенциальные инциденты, обнаруженные системой предиктивной
                  аналитики
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
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Объект</TableHead>
                      <TableHead>Инцидент</TableHead>
                      <TableHead>Горизонт</TableHead>
                      <TableHead>Причина</TableHead>
                      <TableHead>Рекомендация</TableHead>
                      <TableHead className="text-right">Действие</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {alerts.map((alert) => (
                      <TableRow key={alert.id}>
                        <TableCell>
                          <div className="font-medium">
                            {alert.dispatcherName}
                          </div>

                          <div className="text-xs text-muted-foreground">
                            Объект #{alert.systemObjectId}
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge variant="destructive">{alert.scenario}</Badge>
                        </TableCell>

                        <TableCell className="whitespace-nowrap font-medium">
                          {alert.horizon}
                        </TableCell>

                        <TableCell className="max-w-[280px]">
                          <p className="text-sm">{alert.reason}</p>
                        </TableCell>

                        <TableCell className="max-w-[320px]">
                          <p className="text-sm text-muted-foreground">
                            {alert.recommendation ?? "—"}
                          </p>
                        </TableCell>

                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="secondary"
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

        {/* Журнал */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle className="text-lg">Журнал инцидентов</CardTitle>

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
              <p className="text-sm text-muted-foreground">
                В журнале пока нет записей.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Объект</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Инцидент</TableHead>
                      <TableHead>Горизонт</TableHead>
                      <TableHead>Причина</TableHead>
                      <TableHead>Создан</TableHead>
                      <TableHead className="text-right">Действие</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {incidents.map((incident) => (
                      <TableRow key={incident.id}>
                        <TableCell className="font-mono text-sm">
                          #{incident.systemObjectId}
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant={
                              incident.status === "OPEN"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {statusLabels[incident.status] ?? incident.status}
                          </Badge>
                        </TableCell>

                        <TableCell className="font-medium">
                          {incident.scenario}
                        </TableCell>

                        <TableCell className="whitespace-nowrap">
                          {incident.horizon}
                        </TableCell>

                        <TableCell className="max-w-[280px] text-sm text-muted-foreground">
                          {incident.reason}
                        </TableCell>

                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {new Date(incident.createdAt).toLocaleString("ru-RU")}
                        </TableCell>

                        <TableCell className="text-right">
                          <RecordActionDialog
                            incidentId={incident.id}
                            onSubmit={(payload) =>
                              recordAction({
                                incidentId: incident.id,
                                payload,
                              })
                            }
                          />
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
