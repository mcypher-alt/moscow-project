import { useNavigate } from "react-router";
import { useMemo, useState } from "react";
import { Search, Network, AlertTriangle, CheckCircle2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useObjects } from "../hooks/useDispatcher";

export function ObjectsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  // 1. Тянем реальные объекты из хука
  const { data: objects = [], isLoading, error } = useObjects();

  // 2. Живая фильтрация
  const filteredObjects = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return objects;

    return objects.filter((object) =>
        [
          object.name,
          object.kindLabel ?? object.objectKind,
          object.parent?.name ?? "",          // <-- вместо object.parentName
          String(object.id),
          object.incident?.scenario ?? "",     // <-- вместо object.activeIncident
        ]
          .join(" ")
          .toLowerCase()
          .includes(query)
      );
    }, [objects, search]);

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Объекты инфраструктуры</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Реестр инженерных узлов, иерархия и состояние предиктивных рисков
        </p>
      </div>

      {/* Поиск */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Поиск объектов</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Поиск по названию, номеру ID, типу или инциденту..."
              className="pl-9 h-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Состояние загрузки */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <p className="text-sm text-muted-foreground animate-pulse">
            Загрузка реестра объектов...
          </p>
        </div>
      ) : error ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-8 text-center text-sm text-destructive">
            Ошибка при загрузке объектов из базы данных.
          </CardContent>
        </Card>
      ) : (
        /* Сетка реальных объектов */
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredObjects.map((object) => {
            const isCritical = object.status === "CRITICAL";

            return (
              <Card
                key={object.id}
                className={`flex flex-col justify-between transition-all hover:border-primary/50 ${
                  isCritical ? "border-destructive/40 bg-destructive/[0.02]" : ""
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="text-base font-semibold truncate">
                        {object.name}
                      </CardTitle>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>ID #{object.id}</span>
                        <span>•</span>
                        <span className="font-mono bg-muted px-1.5 py-0.2 rounded">
                          Уровень {object.level}
                        </span>
                      </div>
                    </div>

                    <Badge
                      variant={isCritical ? "destructive" : "secondary"}
                      className="shrink-0 text-[11px]"
                    >
                      {isCritical ? "Критический риск" : "Штатно"}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 text-sm">
                  <div className="space-y-2 border-t pt-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Тип узла</p>
                      <p className="text-xs font-medium mt-0.5 truncate">
                        {object.kindLabel || object.objectKind}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground">Родительский узел</p>
                      <p className="text-xs font-medium mt-0.5 flex items-center gap-1 text-muted-foreground">
                        <Network className="h-3 w-3 shrink-0" />
                        <span className="truncate">
                          {object.parent?.name || "Корневой узел"}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="rounded-md border p-2.5 bg-muted/40">
                    <p className="text-[11px] font-medium text-muted-foreground">
                      Активный прогноз:
                    </p>
                    {object.incident ? (
                      <p className="text-xs font-medium text-destructive mt-1 flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{object.incident.scenario}</span>
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                        Риски не обнаружены
                      </p>
                    )}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => navigate(`/objects/${object.id}`)}
                  >
                    Паспорт объекта
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!isLoading && filteredObjects.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center text-sm text-muted-foreground">
            По запросу "{search}" объектов не найдено.
          </CardContent>
        </Card>
      )}
    </div>
  );
}