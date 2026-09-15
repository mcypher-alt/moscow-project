/*
  Warnings:

  - You are about to drop the column `systemObjectId` on the `SensorChannel` table. All the data in the column will be lost.
  - You are about to drop the column `channelTypeId` on the `TelemetryLog` table. All the data in the column will be lost.
  - Added the required column `sensorId` to the `SensorChannel` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unit` to the `SensorType` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "SensorChannel" DROP CONSTRAINT "SensorChannel_systemObjectId_fkey";

-- DropIndex
DROP INDEX "TelemetryLog_channelId_recordedAt_idx";

-- DropIndex
DROP INDEX "TelemetryLog_recordedAt_idx";

-- AlterTable
ALTER TABLE "SensorChannel" DROP COLUMN "systemObjectId",
ADD COLUMN     "criticalMax" DOUBLE PRECISION,
ADD COLUMN     "criticalMin" DOUBLE PRECISION,
ADD COLUMN     "sensorId" TEXT NOT NULL,
ADD COLUMN     "warningMax" DOUBLE PRECISION,
ADD COLUMN     "warningMin" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "SensorType" ADD COLUMN     "unit" TEXT NOT NULL;

-- AlterTable
CREATE SEQUENCE telemetrylog_id_seq;
ALTER TABLE "TelemetryLog" DROP COLUMN "channelTypeId",
ALTER COLUMN "id" SET DEFAULT nextval('telemetrylog_id_seq');
ALTER SEQUENCE telemetrylog_id_seq OWNED BY "TelemetryLog"."id";

-- CreateTable
CREATE TABLE "PhysicalSensor" (
    "id" TEXT NOT NULL,
    "serialNumber" TEXT,
    "model" TEXT,
    "location" TEXT,
    "isOnline" BOOLEAN NOT NULL DEFAULT true,
    "systemObjectId" INTEGER NOT NULL,

    CONSTRAINT "PhysicalSensor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PhysicalSensor_serialNumber_key" ON "PhysicalSensor"("serialNumber");

-- CreateIndex
CREATE INDEX "TelemetryLog_channelId_recordedAt_idx" ON "TelemetryLog"("channelId", "recordedAt" DESC);

-- CreateIndex
CREATE INDEX "TelemetryLog_recordedAt_idx" ON "TelemetryLog"("recordedAt" DESC);

-- AddForeignKey
ALTER TABLE "PhysicalSensor" ADD CONSTRAINT "PhysicalSensor_systemObjectId_fkey" FOREIGN KEY ("systemObjectId") REFERENCES "SystemObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SensorChannel" ADD CONSTRAINT "SensorChannel_sensorId_fkey" FOREIGN KEY ("sensorId") REFERENCES "PhysicalSensor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
