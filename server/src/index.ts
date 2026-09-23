import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { startTelemetryWorker } from './workers/telemetry.worker.js';
import authRouter from '../src/routes/authorization.js';
import incidentsRouter from '../src/routes/incidents.js';
import alertsRouter from '../src/routes/alerts.js';
import objectsRouter from '../src/routes/objects.js';

(BigInt.prototype as any).toJSON = function () {
    return this.toString();
};

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    }));

// Подключение роутов
app.use('/api/auth', authRouter);
app.use('/api/incidents', incidentsRouter);
app.use('/api/alerts', alertsRouter);
app.use('api/objects', objectsRouter);

app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Бэкенд запущен на http://localhost:${PORT}`);
    startTelemetryWorker();
});