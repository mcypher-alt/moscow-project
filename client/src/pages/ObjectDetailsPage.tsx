import { objectKindLabel } from '../lib/objectLabels';
import { IncidentLink } from '../components/IncidentLink';
import { RecordActionDialog } from '../components/RecordActionDialog';
import { useAuth, useIncidents } from '../hooks/useDispatcher';
import { decisionLabels, reasonLabels } from '../lib/decisions';
import { MaintenanceDialog } from '../components/MaintenanceDialog';
import { useParams, useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { useObject, objectRisk, isForecastFresh } from '../hooks/useObjects';

export function ObjectDetailsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { recordAction } = useIncidents();
  const canAct = user?.role === 'ADMIN' || user?.role === 'DISPATCHER';
  const { id } = useParams();
  const query = useObject(id);
  const item = query.data;
  const forecast = item?.forecasts?.[0];
  const object = item ? { id: item.id, name: item.dispatcherName, type: objectKindLabel(item.objectKind),
    address: item.address ?? "Локация не предоставлена", status: objectRisk(item).toUpperCase(),
    incident: forecast?.scenario ?? "Прогноза нет", horizon: forecast ? `${forecast.horizonHours} часа • (${forecast.probability.toFixed(1)}%)` : "—",
    reason: forecast?.reason ?? "—", recommendation: forecast?.recommendation ?? "—",
    sensors: (item.channels ?? []).map(channel => ({ name: channel.sensorName, id: channel.id,
      value: channel.events[0] ? `${channel.events[0].rawValue ?? channel.events[0].numericValue ?? "—"} • ${new Date(channel.events[0].recordedAt).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' }) + ' МСК'}` : "Нет показаний",
      status: channel.events[0] && query.dataUpdatedAt - Date.parse(channel.events[0].recordedAt) > 300000 ? "STALE" : channel.events[0]?.isAlarm ? "ALARM" : channel.events[0] ? "NORMAL" : "UNKNOWN" })),
  } : undefined;
  if (query.isLoading) return <p className="p-6" role="status">Загрузка объекта…</p>;
  if (query.isError) return <p className="p-6" role="alert">Не удалось загрузить объект.</p>;

  if (!object) {
    return (
      <div className="p-6">
        <p>Объект не найден.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate("/objects")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад к объектам
        </Button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{object.name}</h1>
            {item && <IncidentLink object={item} label="Перейти к инциденту" />}

            <p className="mt-1 text-sm text-muted-foreground">
              Объект #{object.id}
            </p>
          </div>

          <Badge
            variant={object.status === "CRITICAL" ? "destructive" : "secondary"}
          >
            {object.status === "CRITICAL"
              ? "Требует проверки"
              : object.status === "WARNING" ? "Повышенный риск" : object.status === "NORMAL" ? "Ниже порога модели" : "Нет актуального прогноза"}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Информация об объекте</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">Тип объекта</p>
              <p className="mt-1 font-medium">{object.type}</p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">Локация</p>
              <p className="mt-1 font-medium">{object.address}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle>Последний прогноз</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {forecast && <p className="text-sm text-muted-foreground">
              Данные: {new Date(forecast.evaluatedAt).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })} МСК · модель {forecast.modelVersion}.
              {!isForecastFresh(forecast) && ' Данные устарели; прогноз не отражает текущее состояние.'}
            </p>}
            <div>
              <p className="text-xs text-muted-foreground">Инцидент</p>
              <p className="mt-1 font-medium">{object.incident}</p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">Горизонт</p>
              <p className="mt-1 font-medium">{object.horizon}</p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">Причина</p>
              <p className="mt-1">{object.reason}</p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">Рекомендация</p>
              <p className="mt-1 mb-3">{object.recommendation}</p><MaintenanceDialog objectId={object.id} />
            </div>
          </CardContent>
        </Card>
      </div>

      {!!item?.incidents?.length && <Card><CardHeader><CardTitle>Решения и результаты проверки</CardTitle></CardHeader><CardContent className="space-y-4">{item.incidents.map(incident => <section key={incident.id} className="border rounded p-3 space-y-2"><p className="font-semibold">{incident.scenario} · {{ OPEN: 'Открыт', IN_PROGRESS: 'В работе', CONFIRMED: 'Подтверждён', FALSE_POSITIVE: 'Ложное срабатывание', RESOLVED: 'Устранён' }[incident.status]}</p><RecordActionDialog incident={incident} disabled={!canAct || ['RESOLVED','FALSE_POSITIVE'].includes(incident.status)} onSubmit={payload => recordAction({ incidentId: incident.id, payload })} />{incident.actions?.map(action => <p key={action.id}>{new Date(action.createdAt).toLocaleString('ru-RU')} · {decisionLabels[action.decision] ?? action.decision} · {reasonLabels[action.reasonCode ?? ''] ?? action.reasonCode}: {action.comment || 'Без комментария'}</p>)}</section>)}</CardContent></Card>}
      {!!item?.workRequests?.length && <Card><CardHeader><CardTitle>Плановые работы и заявки</CardTitle></CardHeader><CardContent>{item.workRequests.map(work => <p key={work.externalId}>{work.externalId}: {work.status} — {work.description}</p>)}</CardContent></Card>}
      <Card>
        <CardHeader>
          <CardTitle>Датчики объекта</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="space-y-3">
            {object.sensors.map((sensor) => (
              <div
                key={sensor.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div>
                  <p className="font-medium">{sensor.name}</p>

                  <p className="text-sm text-muted-foreground">
                    {sensor.value}
                  </p>
                </div>

                <Badge
                  variant={
                    sensor.status === "ALARM" ? "destructive" : "secondary"
                  }
                >
                  {{ STALE: 'Устаревшие показания', ALARM: 'Тревожный сигнал', NORMAL: 'Без тревожного сигнала', UNKNOWN: 'Нет показаний' }[sensor.status]}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
