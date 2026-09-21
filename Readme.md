# Платформа предиктивного мониторинга телеметрии и инцидентов

Система раннего обнаружения технологических сбоев, охранных и пожарных инцидентов на объектах диспетчеризации. Платформа собирает телеметрию датчиков, передает её в сервис машинного обучения для оценки рисков и доставляет критические оповещения на дашборд оператора в реальном времени через SSE.

Все компоненты системы (база данных PostgreSQL, кэш Redis, бэкенд на Node.js и фронтенд на React/Vite) полностью упакованы в Docker. Устанавливать Node.js, npm или сторонние базы на хост-машину не требуется.
Требования

    Docker и Docker Compose (входят в состав Docker Desktop).

Быстрый старт (All-in-Docker)

## 1. Конфигурация окружения (.env)

Создайте файл .env в папке server/:

```Bash

touch server/.env

```

Вставьте в него следующие параметры:
Фрагмент кода

DATABASE_URL="postgresql://dev:password@localhost:5433/main_db?schema=public"
USE_ML_MOCK=true
ML_SERVICE_URL=<http://localhost:8000/predict>
REDIS_URL=redis://localhost:6379
JWT_SECRET=supersecretjwtkey_change_me_in_prod_12345
PORT=5000

## 2. Сборка и запуск всех сервисов

В корневой директории проекта выполните:

```Bash

docker compose up --build -d

```

    Docker автоматически соберет контейнеры бэкенда и фронтенда, а также поднимет PostgreSQL и Redis.

Проверить статус контейнеров:

```Bash

docker compose ps

```

## 3. Миграции и заполнение базы данными (Seeding)

Так как локального npm нет, команды выполняются напрямую внутри работающего контейнера сервера:

```Bash

### 1. Применяем миграции Prisma

docker compose exec server npx prisma migrate dev

### 2. Запускаем полное сидирование (диспетчеры + телеметрия из CSV)

docker compose exec server npm run seed:all

```

    Скрипт seed:all последовательно выполнит seed:dispatchers (создаст тестового оператора) и seed:csv (импортирует объекты, каналы и замеры датчиков).

## 4. Вход в систему

Откройте браузер по адресу: <http://localhost:5173>
Учетные данные диспетчера:

    Логин: dispatcher@test.ru

    Пароль: admin123

Дополнительные команды

    Просмотр логов в реальном времени:
    Bash

    # Логи всех сервисов
    docker compose logs -f

    # Только логи бэкенда (воркер телеметрии и инференс)
    docker compose logs -f server

    Перезапуск конкретного сервиса:
    Bash

    docker compose restart server

    Полная остановка проекта:
    Bash

    docker compose down

    Остановка с удалением сохраненных данных базы:
    Bash

    docker compose down -v