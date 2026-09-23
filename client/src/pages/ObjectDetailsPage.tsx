import { useParams, useNavigate } from "react-router";
import { ArrowLeft, CheckCircle2, Network, Cpu, AlertTriangle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useObjectDetails } from "../hooks/useDispatcher";

export function ObjectDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const { data: object, isLoading, error } = useObjectDetails(id);

  // 1. Состояние загрузки
  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center p-6">
        <p className="text-sm text-muted-foreground animate-pulse">
          Загрузка паспорта объекта...
        </p>
      </div>
    );
  }

  // 2. Обработка ошибки / отсутствия объекта в БД
  if (error || !object) {
    return (
      <div className="space-y-4 p-6 max-w-[1400px] mx-auto">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад
        </Button>
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-8 text-center">
          <p className="text-sm font-medium text-destructive">
            Объект #{id} не найден в базе данных или произошла ошибка загрузки.
          </p>
        </div>
      </div>
    );
  }

  const isCritical = object.status === "CRITICAL" && Boolean(object.incident);

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-[1400px] mx-auto">
      {/* Шапка страницы */}
      <div>
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Назад
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{object.name}</h1>
            <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <span>ИД объекта: #{object.id}</span>
              <span>•</span>
              <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">
                Уровень иерархии: {object.level}
              </span>
            </div>
          </div>

          <Badge
            variant={isCritical ? "destructive" : "secondary"}
            className="text-xs"
          >
            {isCritical ? "Критический риск" : "Штатное состояние"}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Карточка 1: Параметры объекта и иерархия */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Network className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base font-semibold">
                Параметры объекта и топология
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Вид объекта (objectKind)</p>
              <p className="mt-1 font-medium">{object.kindLabel}</p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">Родительский узел (parentId)</p>
              {object.parent ? (
                <button
                  type="button"
                  onClick={() => navigate(`/objects/${object.parent?.id}`)}
                  className="mt-1 text-sm font-medium text-primary hover:underline flex items-center gap-1.5"
                >
                  <span>{object.parent.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    (#{object.parent.id})
                  </span>
                </button>
              ) : (
                <p className="mt-1 text-muted-foreground">Корневой уровень системы</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 pt-3 border-t">
              <div>
                <p className="text-xs text-muted-foreground">Каналов телеметрии</p>
                <p className="mt-1 text-xl font-bold">{object.sensors.length}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Дочерних узлов</p>
                <p className="mt-1 text-xl font-bold">{object.childrenCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Карточка 2: Активный прогноз или штатный режим */}
        {object.incident ? (
          <Card className="border-destructive/30">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                <CardTitle className="text-base font-semibold text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Активный прогноз инцидента
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3.5 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Прогнозируемая авария</p>
                <p className="mt-1 font-medium text-destructive">{object.incident.scenario}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Расчетный горизонт</p>
                <p className="mt-1 font-medium">{object.incident.horizon}</p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Фактор-триггер</p>
                <p className="mt-1 text-muted-foreground leading-relaxed">
                  {object.incident.reason}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Предписанный регламент</p>
                <p className="mt-1 leading-relaxed">
                  {object.incident.recommendation || "Согласно технологической карте объекта"}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-green-500/20 bg-green-500/5">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-5 w-5" />
                <CardTitle className="text-base font-semibold">Состояние штатное</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Система предиктивной аналитики не обнаружила критических отклонений или рисков аварии на данном объекте.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Карточка 3: Сенсоры и каналы телеметрии */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base font-semibold">
                Подключенные датчики и каналы
              </CardTitle>
            </div>
            <Badge variant="outline" className="text-xs">
              Всего: {object.sensors.length}
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          {object.sensors.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <p className="text-sm text-muted-foreground">
                К объекту пока не привязано ни одного датчика.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {object.sensors.map((sensor) => (
                <div
                  key={sensor.id}
                  className="flex flex-col justify-between rounded-lg border bg-card p-3.5 space-y-2 shadow-sm"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-snug break-words">
                        {sensor.name}
                      </p>
                      <span className="font-mono text-[10px] text-muted-foreground shrink-0 bg-muted px-1.5 py-0.5 rounded">
                        #{sensor.id}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {sensor.systemType || "Общий контур"}
                    </p>
                  </div>

                  <div className="pt-2 border-t flex items-center justify-between text-xs">
                    <span className="font-mono text-muted-foreground text-[11px] truncate max-w-[140px]">
                      {sensor.systemTag}
                    </span>
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      {sensor.sensorType || "Аналоговый"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}