import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const objects = [
  {
    id: 5122,
    name: "ДУ объект Альфа",
    type: "Насосная станция",
    address: "Инженерный коллектор №5122",
    status: "CRITICAL",
    incident: "Перегрев подшипника насоса",
    horizon: "24–48 часов",
    reason: "Резкий рост вибрации на фоне падения давления масла",
    recommendation: "Остановить агрегат на ТО и направить дежурную бригаду",
    sensors: [
      { name: "Датчик вибрации", value: "8.4 мм/с", status: "ALARM" },
      { name: "Давление масла", value: "1.6 бар", status: "WARNING" },
      { name: "Температура подшипника", value: "78 °C", status: "ALARM" },
    ],
  },
  {
    id: 3814,
    name: "Коллектор №3814",
    type: "Кабельный отсек",
    address: "Восточный административный округ",
    status: "WARNING",
    incident: "Повышенный пожарный риск",
    horizon: "24 часа",
    reason: "Аномальный рост температуры в кабельном отсеке",
    recommendation: "Проверить кабельную линию и вентиляцию отсека",
    sensors: [
      { name: "Температура", value: "65.5 °C", status: "ALARM" },
      { name: "Дым", value: "Нет", status: "NORMAL" },
    ],
  },
];

export function ObjectDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const object = objects.find((item) => String(item.id) === id);

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

            <p className="mt-1 text-sm text-muted-foreground">
              Объект #{object.id}
            </p>
          </div>

          <Badge
            variant={object.status === "CRITICAL" ? "destructive" : "secondary"}
          >
            {object.status === "CRITICAL"
              ? "Критический риск"
              : "Повышенный риск"}
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
            <CardTitle>Активный прогноз</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
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
              <p className="mt-1">{object.recommendation}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Датчики объекта</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="space-y-3">
            {object.sensors.map((sensor) => (
              <div
                key={sensor.name}
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
                  {sensor.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
