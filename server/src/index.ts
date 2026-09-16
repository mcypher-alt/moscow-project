import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { startTelemetryWorker } from './workers/telemetry.worker.js';
import authRouter from '../src/routes/authorization.js';
import incidentsRouter from '../src/routes/incidents.js';

(BigInt.prototype as any).toJSON = function () {
    return this.toString();
};

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
    origin: ['http://localhost:3000'],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(helmet());

// Подключение роутов
app.use('/api/auth', authRouter);
app.use('/api/incidents', incidentsRouter);

app.listen(PORT, () => {
    console.log(`Бэкенд запущен на http://localhost:${PORT}`);
    startTelemetryWorker();
});