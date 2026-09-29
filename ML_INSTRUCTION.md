# ML Moscollector — инструкция для обучения на ПК

Эта папка — отдельный training workspace. Сырые данные и `.venv` в GitHub не отправлять.

## 0. Что мы обучаем

Первый обязательный baseline:

**по истории телеметрии объекта определить, случится ли тревожное событие в следующие 24 часа.**

Результат модели:

- `isIncidentPredicted` — `true/false`;
- `probability` — откалиброванная оценка риска 0–100%;
- `horizon` — `24 часа`.

Дополнительно скрипт строит proxy-targets по типам датчиков:

- `target_fire_24h`;
- `target_flood_24h`;
- `target_pump_24h`;
- `target_gas_24h`;
- `target_security_24h`;
- `target_temperature_24h`.

Это **proxy по будущим тревогам соответствующих датчиков**, а не полноценная экспертная разметка инцидентов. Не выдавать их за ручную ground truth-разметку.

## 1. Компьютер

Целевая машина:

- Windows 11;
- Ryzen 7 9700X;
- 32 GB DDR5;
- RTX 5070;
- 300–500 GB свободного SSD.

Этого достаточно.

Сначала делаем baseline на CPU. GPU пробуем только после того, как CPU-пайплайн полностью отработал.

## 2. Что нужно получить вместе с этой папкой

Нужны:

1. Все ZIP-архивы журналов за доступные годы (`ext-journal-2019.zip`, ...).
2. `справочник_каналов_датчиков (1).csv`
3. `справочник_состояний.csv`
4. `справочник_объектов_диспетчер (1).csv`

Файл `журнал_событий_пример (1).csv` можно использовать только для проверки структуры, но для реального обучения нужны полные архивы.

## 3. Подготовка папки

Распаковать этот bundle, например в:

```text
C:\ml-moscollector
```

Структура уже должна быть такой:

```text
C:\ml-moscollector\
  README.md
  requirements.txt
  setup.ps1
  extract_archives.ps1
  run_pipeline.ps1

  data\
    archives\
    raw\
    reference\
    processed\
    tmp\

  models\
  reports\
  scripts\
    01_inspect_data.py
    02_build_dataset.py
    03_train_model.py
    04_score_latest.py
```

## 4. Положить данные

### Архивы

Все ZIP-файлы положить сюда:

```text
C:\ml-moscollector\data\archives\
```

Например:

```text
data\archives\ext-journal-2019.zip
data\archives\ext-journal-2020.zip
...
data\archives\ext-journal-2026.zip
```

### Справочники

В `data\reference` положить и переименовать:

```text
справочник_каналов_датчиков (1).csv
    -> data\reference\channels.csv

справочник_состояний.csv
    -> data\reference\states.csv

справочник_объектов_диспетчер (1).csv
    -> data\reference\objects.csv
```

Имена должны быть **ровно** `channels.csv`, `states.csv`, `objects.csv`.

## 5. Установить Python

Открыть PowerShell.

Проверить:

```powershell
py -3.11 --version
```

Если Python 3.11 отсутствует:

```powershell
winget install -e --id Python.Python.3.11
```

После установки закрыть PowerShell и открыть снова.

Перейти в проект:

```powershell
cd C:\ml-moscollector
```

Запустить установку:

```powershell
powershell -ExecutionPolicy Bypass -File .\setup.ps1
```

Скрипт создаст `.venv` и установит:

- pandas;
- NumPy;
- DuckDB;
- PyArrow;
- scikit-learn;
- CatBoost;
- matplotlib;
- joblib;
- psutil.

В конце должно быть:

```text
SETUP OK
```

## 6. Проверить NVIDIA

В PowerShell:

```powershell
nvidia-smi
```

Должна отображаться RTX 5070.

Если `nvidia-smi` не работает, обновить NVIDIA Driver.

**CUDA Toolkit специально пока не ставить.** CPU baseline от него не зависит.

## 7. Распаковать архивы

Из `C:\ml-moscollector`:

```powershell
powershell -ExecutionPolicy Bypass -File .\extract_archives.ps1
```

Все архивы попадут в:

```text
data\raw\
```

Не складывать в `data\raw` справочники. Там должны быть именно журналы событий.

## 8. Проверить данные

Запустить:

```powershell
.\.venv\Scripts\python.exe .\scripts\01_inspect_data.py
```

Скрипт проверит:

- RAM/CPU;
- наличие справочников;
- количество CSV журналов;
- нужные колонки;
- примерную долю тревог.

Если написано:

```text
CHECK COMPLETE
```

идём дальше.

Если пишет `не найдено журналов`, проверить распаковку и структуру CSV.

Не редактировать названия колонок вручную.

## 9. Построить ML dataset

Запуск:

```powershell
.\.venv\Scripts\python.exe .\scripts\02_build_dataset.py --threads 16 --snapshot-step 3
```

Что делает скрипт:

1. Находит все журналы событий.
2. Через DuckDB читает их потоково, не пытаясь загрузить все сырые данные сразу в RAM.
3. Связывает `ид_канала_данных` со справочником каналов.
4. Агрегирует телеметрию по объектам и часам.
5. Строит признаки за 1, 6 и 24 часа.
6. Делает target: тревога в следующие 24 часа.
7. Делает дополнительные target по группам датчиков.
8. Сохраняет:

```text
data\processed\hourly_base.parquet
data\processed\train_dataset.parquet
```

`--snapshot-step 3` означает один обучающий snapshot каждые 3 часа. Это хороший баланс для 32 GB RAM.

Если RAM не хватает:

```powershell
.\.venv\Scripts\python.exe .\scripts\02_build_dataset.py --threads 12 --snapshot-step 6
```

Если `hourly_base.parquet` уже успешно построен и нужно только перестроить признаки:

```powershell
.\.venv\Scripts\python.exe .\scripts\02_build_dataset.py --reuse-hourly --snapshot-step 3
```

## 10. Обучить первую модель

Сначала CPU:

```powershell
.\.venv\Scripts\python.exe .\scripts\03_train_model.py --target target_alarm_24h --model-name general_24h --depth 8 --iterations 1500 --learning-rate 0.05
```

Модель:

- делит данные **по времени**, а не случайно;
- первые ~70% времени — train;
- следующие ~15% — validation;
- последние ~15% — test;
- использует balancing редкого класса;
- подбирает threshold по validation;
- отдельно калибрует вероятность;
- считает Precision, Recall, F1, Average Precision и ROC-AUC;
- сохраняет confusion matrix в metadata.

После обучения появятся:

```text
models\general_24h.cbm
models\general_24h_calibrator.joblib
models\general_24h.json

reports\general_24h_feature_importance.csv
reports\general_24h_pr_curve.png
```

## 11. Как понимать результат

Главное смотреть не на Accuracy.

События редкие, поэтому Accuracy может быть огромной даже у бесполезной модели.

Смотреть:

```text
precision
recall
f1
average_precision
confusion_matrix
```

`Precision` — среди предупреждений модели какая доля реально закончилась тревогой.

`Recall` — какую долю будущих тревог модель смогла заранее поймать.

`F1` — баланс precision/recall.

`average_precision` — качество ранжирования на несбалансированном датасете.

Метрики **test** важнее validation для финального отчёта.

Не подбирать параметры по test снова и снова. Параметры сравнивать на validation, test использовать как финальную проверку.

## 12. Проверить модель

После обучения:

```powershell
.\.venv\Scripts\python.exe .\scripts\04_score_latest.py --model-name general_24h
```

Для конкретного объекта:

```powershell
.\.venv\Scripts\python.exe .\scripts\04_score_latest.py --model-name general_24h --object-id 5122
```

Вывод будет примерно:

```json
{
  "objectId": 5122,
  "snapshotTime": "2026-08-01 12:00:00",
  "isIncidentPredicted": true,
  "probability": 83.71,
  "threshold": 61.24,
  "model": "general_24h",
  "target": "target_alarm_24h",
  "horizon": "24 часа"
}
```

`probability` уже проходит простую калибровку поверх CatBoost score.

## 13. Попробовать GPU

Только после успешного CPU baseline.

```powershell
.\.venv\Scripts\python.exe .\scripts\03_train_model.py --target target_alarm_24h --model-name general_24h_gpu --gpu --depth 8 --iterations 1500 --learning-rate 0.05
```

Если CatBoost выдаёт CUDA/GPU ошибку на RTX 5070:

**не тратить время на CUDA.**

Просто обучать CPU-версию на Ryzen 7 9700X.

## 14. Обучение отдельных типов риска

Сначала посмотреть, какие targets имеют достаточно положительных примеров. `02_build_dataset.py` напечатает их количество.

Если положительных примеров меньше 50, конкретную модель не обучаем.

Пожар:

```powershell
.\.venv\Scripts\python.exe .\scripts\03_train_model.py --target target_fire_24h --model-name fire_24h
```

Подтопление:

```powershell
.\.venv\Scripts\python.exe .\scripts\03_train_model.py --target target_flood_24h --model-name flood_24h
```

Насос:

```powershell
.\.venv\Scripts\python.exe .\scripts\03_train_model.py --target target_pump_24h --model-name pump_24h
```

Газ:

```powershell
.\.venv\Scripts\python.exe .\scripts\03_train_model.py --target target_gas_24h --model-name gas_24h
```

Несанкционированный доступ:

```powershell
.\.venv\Scripts\python.exe .\scripts\03_train_model.py --target target_security_24h --model-name security_24h
```

Температурный риск:

```powershell
.\.venv\Scripts\python.exe .\scripts\03_train_model.py --target target_temperature_24h --model-name temperature_24h
```

Важно: эти классы создаются автоматически из типа будущего тревожного датчика. Это хороший hackathon baseline, но если найдётся отдельная таблица с настоящим типом подтверждённого инцидента, надо перейти на неё как на ground truth.

## 15. Какие эксперименты делать дальше

После baseline менять **один параметр за раз** и сравнивать validation metrics.

Вариант 1:

```powershell
.\.venv\Scripts\python.exe .\scripts\03_train_model.py --target target_alarm_24h --model-name general_d6 --depth 6 --iterations 2000 --learning-rate 0.04
```

Вариант 2:

```powershell
.\.venv\Scripts\python.exe .\scripts\03_train_model.py --target target_alarm_24h --model-name general_d10 --depth 10 --iterations 1200 --learning-rate 0.05
```

Вариант 3:

```powershell
.\.venv\Scripts\python.exe .\scripts\03_train_model.py --target target_alarm_24h --model-name general_lr003 --depth 8 --iterations 2200 --learning-rate 0.03
```

Не надо запускать огромный grid search в первый день.

Цель: получить устойчивый baseline и понять, где модель ошибается.

## 16. Что НЕ делать

Не делать random train/test split.

Не обучать на `target_*` или `future_*` колонках как на features.

Не оптимизировать Accuracy.

Не подмешивать данные из будущего в признаки.

Не обучать модель при каждом API-запросе.

Не коммитить в GitHub:

```text
.venv\
data\raw\
data\processed\
data\tmp\
```

Сырые архивы также не коммитить.

## 17. Как связать с API потом

Для общей модели:

```text
probability = calibrated_probability * 100
isIncidentPredicted = probability >= threshold
horizon = "24 часа"
```

Итоговый контракт примерно:

```json
{
  "isIncidentPredicted": true,
  "probability": 87,
  "horizon": "24 часа"
}
```

`incidentType` можно выбирать по специализированным моделям (`fire_24h`, `flood_24h` и т.д.) — у какой вероятность выше и проходит её threshold.

`reason` и `recommendation` эта binary-модель сама не генерирует. Их надо формировать отдельным интерпретационным/правиловым слоем на основе:

- типа риска;
- наиболее важных сигналов;
- справочника состояний;
- согласованных рекомендаций для системы.

Не надо выдумывать `reason` из воздуха.

## 18. Что сохранить после обучения

Обязательно:

```text
models\general_24h.cbm
models\general_24h_calibrator.joblib
models\general_24h.json

reports\general_24h_feature_importance.csv
reports\general_24h_pr_curve.png
```

Плюс скопировать из терминала итоговый блок:

```text
=== VALIDATION ===
...

=== TEST ===
...
```

Если обучались специализированные модели — отправить их `.cbm`, `_calibrator.joblib` и `.json` тоже.

Также написать:

```text
Сколько строк в train_dataset
Сколько положительных примеров
Временные границы train/val/test
CPU или GPU
Сколько заняло обучение
```

## 19. Самый короткий запуск после подготовки данных

Если все архивы и справочники уже разложены правильно:

```powershell
cd C:\ml-moscollector
powershell -ExecutionPolicy Bypass -File .\run_pipeline.ps1
```

Он автоматически:

1. проверит данные;
2. построит dataset;
3. обучит general 24h модель на CPU;
4. сделает test prediction.

## 20. Если что-то упало

### `Python 3.11 not found`

```powershell
winget install -e --id Python.Python.3.11
```

Перезапустить PowerShell.

### `running scripts is disabled`

Запускать `.ps1` так:

```powershell
powershell -ExecutionPolicy Bypass -File .\setup.ps1
```

### Не хватает RAM

Перестроить dataset реже:

```powershell
.\.venv\Scripts\python.exe .\scripts\02_build_dataset.py --reuse-hourly --snapshot-step 6
```

### GPU error

Убрать `--gpu`.

### `too few positives`

Такую специализированную модель пока не обучать. Использовать general model.

### В validation/test только один класс

Не использовать random split автоматически. Сначала проверить распределение тревог по годам. Возможно, надо изменить временные границы вручную после анализа данных.

### DuckDB использует диск

Это нормально. `data\tmp` — временный out-of-core каталог. На SSD должно оставаться достаточно свободного места.

## 21. Важная методологическая оговорка

Текущие журналы дают тревожность события и данные датчика. Поэтому первая честная задача — прогноз будущей тревоги.

Если есть отдельный датасет с:

- подтверждённым фактом реального инцидента;
- временем начала инцидента;
- типом инцидента;
- объектом;
- результатом проверки диспетчера;

его обязательно надо подключить. Такая разметка лучше, чем proxy на основе тревожных датчиков, и позволит обучить модель именно на подтверждённые реальные инциденты.
