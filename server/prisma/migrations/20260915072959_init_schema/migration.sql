-- CreateEnum
CREATE TYPE "Role" AS ENUM ('DISPATCHER', 'ANALYST', 'ADMIN');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('PREDICTED_RISK', 'VERIFIED_DISPATCHED', 'FALSE_ALARM', 'RESOLVED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'DISPATCHER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemObject" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "dispatcherName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemObject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SensorType" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "dispatcherName" TEXT NOT NULL,

    CONSTRAINT "SensorType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SensorChannel" (
    "id" INTEGER NOT NULL,
    "objectTag" TEXT NOT NULL,
    "systemObjectId" INTEGER NOT NULL,
    "sensorTypeId" INTEGER NOT NULL,

    CONSTRAINT "SensorChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelemetryLog" (
    "id" BIGINT NOT NULL,
    "channelId" INTEGER NOT NULL,
    "channelTypeId" INTEGER NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelemetryLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "systemObjectId" INTEGER NOT NULL,
    "scenario" TEXT NOT NULL,
    "probability" DOUBLE PRECISION NOT NULL,
    "timeHorizonHours" INTEGER NOT NULL DEFAULT 24,
    "status" "IncidentStatus" NOT NULL DEFAULT 'PREDICTED_RISK',
    "recommendation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DispatcherAction" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DispatcherAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "SensorChannel_objectTag_idx" ON "SensorChannel"("objectTag");

-- CreateIndex
CREATE INDEX "TelemetryLog_channelId_recordedAt_idx" ON "TelemetryLog"("channelId", "recordedAt");

-- CreateIndex
CREATE INDEX "TelemetryLog_recordedAt_idx" ON "TelemetryLog"("recordedAt");

-- CreateIndex
CREATE INDEX "Incident_status_idx" ON "Incident"("status");

-- AddForeignKey
ALTER TABLE "SensorChannel" ADD CONSTRAINT "SensorChannel_systemObjectId_fkey" FOREIGN KEY ("systemObjectId") REFERENCES "SystemObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SensorChannel" ADD CONSTRAINT "SensorChannel_sensorTypeId_fkey" FOREIGN KEY ("sensorTypeId") REFERENCES "SensorType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelemetryLog" ADD CONSTRAINT "TelemetryLog_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "SensorChannel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_systemObjectId_fkey" FOREIGN KEY ("systemObjectId") REFERENCES "SystemObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatcherAction" ADD CONSTRAINT "DispatcherAction_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatcherAction" ADD CONSTRAINT "DispatcherAction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
