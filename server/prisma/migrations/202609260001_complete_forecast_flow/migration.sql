-- AlterTable
ALTER TABLE "SystemObject" ADD COLUMN     "address" TEXT,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Incident" ADD COLUMN     "forecastId" TEXT,
ADD COLUMN     "modelVersion" TEXT,
ADD COLUMN     "probability" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "DispatcherAction" ADD COLUMN     "reasonCode" TEXT;

-- CreateTable
CREATE TABLE "ForecastJob" (
    "systemObjectId" INTEGER NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "retryAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForecastJob_pkey" PRIMARY KEY ("systemObjectId")
);

-- CreateTable
CREATE TABLE "Forecast" (
    "id" TEXT NOT NULL,
    "systemObjectId" INTEGER NOT NULL,
    "evaluatedAt" TIMESTAMP(3) NOT NULL,
    "probability" DOUBLE PRECISION NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "isIncidentPredicted" BOOLEAN NOT NULL,
    "horizonHours" INTEGER NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "scenario" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Forecast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkRequest" (
    "externalId" TEXT NOT NULL,
    "systemObjectId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkRequest_pkey" PRIMARY KEY ("externalId")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Forecast_createdAt_idx" ON "Forecast"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Forecast_systemObjectId_evaluatedAt_modelVersion_key" ON "Forecast"("systemObjectId", "evaluatedAt", "modelVersion");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Incident_forecastId_key" ON "Incident"("forecastId");

-- AddForeignKey
ALTER TABLE "ForecastJob" ADD CONSTRAINT "ForecastJob_systemObjectId_fkey" FOREIGN KEY ("systemObjectId") REFERENCES "SystemObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Forecast" ADD CONSTRAINT "Forecast_systemObjectId_fkey" FOREIGN KEY ("systemObjectId") REFERENCES "SystemObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkRequest" ADD CONSTRAINT "WorkRequest_systemObjectId_fkey" FOREIGN KEY ("systemObjectId") REFERENCES "SystemObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- Queue existing history once when upgrading an installation.
INSERT INTO "ForecastJob" ("systemObjectId", "updatedAt")
SELECT DISTINCT c."systemObjectId", CURRENT_TIMESTAMP
FROM "SensorChannel" c JOIN "EventLog" e ON e."channelId" = c.id
ON CONFLICT DO NOTHING;
ALTER TABLE "Forecast" ADD CONSTRAINT "Forecast_probability_range" CHECK (probability BETWEEN 0 AND 100 AND threshold BETWEEN 0 AND 100 AND "horizonHours" >= 24);
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_probability_range" CHECK (probability IS NULL OR probability BETWEEN 0 AND 100);
ALTER TABLE "SystemObject" ADD CONSTRAINT "SystemObject_coordinates" CHECK ((latitude IS NULL AND longitude IS NULL) OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180));
