-- CreateEnum
CREATE TYPE "Role" AS ENUM ('DISPATCHER', 'ANALYST', 'ADMIN');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'CONFIRMED', 'FALSE_POSITIVE');

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
    "level" INTEGER NOT NULL,
    "objectKind" TEXT NOT NULL,
    "dispatcherName" TEXT NOT NULL,
    "parentId" INTEGER,

    CONSTRAINT "SystemObject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SensorChannel" (
    "id" INTEGER NOT NULL,
    "systemTag" TEXT NOT NULL,
    "sensorName" TEXT NOT NULL,
    "systemType" TEXT NOT NULL,
    "sensorType" TEXT,
    "systemObjectId" INTEGER NOT NULL,

    CONSTRAINT "SensorChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventLog" (
    "id" BIGINT NOT NULL,
    "channelId" INTEGER NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "isAlarm" BOOLEAN NOT NULL DEFAULT false,
    "rawValue" TEXT,
    "numericValue" DOUBLE PRECISION,

    CONSTRAINT "EventLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "systemObjectId" INTEGER NOT NULL,
    "channelId" INTEGER,
    "scenario" TEXT NOT NULL,
    "horizon" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "recommendation" TEXT,
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

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
CREATE INDEX "SystemObject_parentId_idx" ON "SystemObject"("parentId");

-- CreateIndex
CREATE INDEX "SensorChannel_systemObjectId_idx" ON "SensorChannel"("systemObjectId");

-- CreateIndex
CREATE INDEX "EventLog_channelId_recordedAt_idx" ON "EventLog"("channelId", "recordedAt" DESC);

-- CreateIndex
CREATE INDEX "EventLog_recordedAt_idx" ON "EventLog"("recordedAt" DESC);

-- CreateIndex
CREATE INDEX "EventLog_isAlarm_idx" ON "EventLog"("isAlarm");

-- CreateIndex
CREATE INDEX "Incident_status_idx" ON "Incident"("status");

-- CreateIndex
CREATE INDEX "Incident_systemObjectId_idx" ON "Incident"("systemObjectId");

-- CreateIndex
CREATE INDEX "Incident_createdAt_idx" ON "Incident"("createdAt");

-- AddForeignKey
ALTER TABLE "SystemObject" ADD CONSTRAINT "SystemObject_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "SystemObject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SensorChannel" ADD CONSTRAINT "SensorChannel_systemObjectId_fkey" FOREIGN KEY ("systemObjectId") REFERENCES "SystemObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventLog" ADD CONSTRAINT "EventLog_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "SensorChannel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_systemObjectId_fkey" FOREIGN KEY ("systemObjectId") REFERENCES "SystemObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "SensorChannel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatcherAction" ADD CONSTRAINT "DispatcherAction_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatcherAction" ADD CONSTRAINT "DispatcherAction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
