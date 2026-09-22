import { useNavigate } from "react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type ObjectStatus = "NORMAL" | "WARNING" | "CRITICAL";

interface InfrastructureObject {
  id: number;
  name: string;
  type: string;
  address: string;
  status: ObjectStatus;
  activeIncident?: string;
}

const objects: InfrastructureObject[] = [
  {
    id: 5122,
    name: "ДУ объект Альфа",
    type: "Насосная станция",
    address: "Инженерный коллектор №5122",
    status: "CRITICAL",
    activeIncident: "Перегрев подшипника насоса",
  },
  {
    id: 3814,
    name: "Коллектор №3814",
    type: "Кабельный отсек",
    address: "Восточный административный округ",
    status: "WARNING",
    activeIncident: "Повышенный пожарный риск",
  },
  {
    id: 4201,
    name: "Коллектор №4201",
    type: "Насосная станция",
    address: "Центральный административный округ",
    status: "NORMAL",
  },
  {
    id: 2760,
    name: "Коллектор №2760",
    type: "Вентиляционная шахта",
    address: "Северный административный округ",
    status: "NORMAL",
  },
];

const statusLabels: Record<ObjectStatus, string> = {
  NORMAL: "Штатно",
  WARNING: "Повышенный риск",
  CRITICAL: "Критический риск",
};

export function ObjectsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const filteredObjects = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return objects;

    return objects.filter((object) =>
      [
        object.name,
        object.type,
        object.address,
        String(object.id),
        object.activeIncident ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [search]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Объекты инфраструктуры</h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Состояние инженерных объектов и текущие риски
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Поиск объектов</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Название, ID, тип объекта или инцидент"
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {filteredObjects.map((object) => (
          <Card key={object.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">{object.name}</CardTitle>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Объект #{object.id}
                  </p>
                </div>

                <Badge
                  variant={
                    object.status === "CRITICAL" ? "destructive" : "secondary"
                  }
                >
                  {statusLabels[object.status]}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">Тип</p>

                  <p className="mt-1 text-sm font-medium">{object.type}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">Локация</p>

                  <p className="mt-1 text-sm font-medium">{object.address}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">
                  Активный прогноз
                </p>

                <p className="mt-1 text-sm">
                  {object.activeIncident ?? "Риски не обнаружены"}
                </p>
              </div>

              <Button
                variant="outline"
                onClick={() => navigate(`/objects/${object.id}`)}
              >
                Открыть объект
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredObjects.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Объекты не найдены.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
