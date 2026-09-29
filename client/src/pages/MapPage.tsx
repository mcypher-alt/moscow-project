import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ObjectRiskMap } from '@/components/ObjectRiskMap';

export function MapPage() {
    return (
        <div className="space-y-6 p-6">
            <div>
                <h1 className="text-2xl font-bold">
                    Карта объектов
                </h1>

                <p className="mt-1 text-sm text-muted-foreground">
                    Географическое отображение объектов инфраструктуры и текущих рисков
                </p>
            </div>

            <div className="grid gap-6 xl:grid-cols-[3fr_1fr]">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">
                            Инженерная инфраструктура
                        </CardTitle>
                    </CardHeader>

                    <CardContent>
                        <ObjectRiskMap />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">
                            Легенда
                        </CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-4"><p className="text-sm text-muted-foreground">Серый: нет актуального прогноза. Без координат объекты доступны через поиск и раздел «Объекты».</p>
                        <div className="flex items-center gap-3">
                            <span className="h-3 w-3 rounded-full bg-red-500" />
                            <div>
                                <p className="font-medium">
                                    Требует проверки
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Актуальный прогноз и открытое предупреждение
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <span className="h-3 w-3 rounded-full bg-amber-500" />
                            <div>
                                <p className="font-medium">
                                    Повышенный риск
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Требуется контроль
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <span className="h-3 w-3 rounded-full bg-green-500" />
                            <div>
                                <p className="font-medium">
                                    Ниже порога модели
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Исправность оборудования не подтверждена
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}