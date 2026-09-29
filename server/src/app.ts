import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { prisma } from './db.js';
import authRouter from './routes/authorization.js';
import incidentsRouter from './routes/incidents.js';
import alertsRouter from './routes/alerts.js';
import objectsRouter from './routes/objects.js';
import integrationsRouter from './routes/integrations.js';
import { authenticateJwt, requireRoles } from './middlewares/auth.js';
import { Role, Prisma } from '@prisma/client';

(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function () { return this.toString(); };
export const app = express();
const origins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');
app.use(helmet());
app.use(cors({ origin: origins, credentials: true }));
app.use(cookieParser());
app.use((req, res, next) => {
  // Deliberately omit request bodies, cookies, query strings and credentials from audit logs.
  res.on('finish', () => {
    if (req.path === '/api/health') return;
    void prisma.auditLog.create({ data: { userId: req.user?.id, method: req.method,
      path: req.path, status: res.statusCode } }).catch(error => console.error('AUDIT_WRITE_FAILED', error));
  });
  // Register the audit listener before rejecting a foreign-origin write.
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers.origin && !origins.includes(req.headers.origin)) {
    res.status(403).json({ error: 'Origin not allowed' }); return;
  }
  next();
});
app.use(express.json({ limit: '10mb' }));
app.use(express.text({ type: ['application/xml', 'text/xml'], limit: '10mb' }));
app.get('/api/health', async (_req, res) => {
  try { await prisma.$queryRaw`SELECT 1`; res.json({ status: 'ok' }); }
  catch { res.status(503).json({ status: 'unavailable' }); }
});
app.use('/api/auth', authRouter);
app.use('/api/incidents', incidentsRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/objects', objectsRouter);
app.use('/api/integrations', integrationsRouter);
app.get('/api/summary', authenticateJwt, async (_req, res, next) => {
  try { res.json(await prisma.incident.groupBy({ by: ['status'], _count: { _all: true } })); }
  catch (error) { next(error); }
});
app.get('/api/forecasts', authenticateJwt, async (req, res, next) => {
  try {
    const offset = Number(req.query.offset ?? 0);
    if (!Number.isSafeInteger(offset) || offset < 0) { res.status(400).json({ error: 'Invalid offset' }); return; }
    res.json(await prisma.forecast.findMany({ take: 100, skip: offset,
      orderBy: [{ evaluatedAt: 'desc' }, { id: 'desc' }], include: { systemObject: true } }));
  } catch (error) { next(error); }
});
app.get('/api/operations', authenticateJwt, requireRoles(Role.ADMIN), async (_req, res, next) => {
  try { res.json({ pending: await prisma.forecastJob.count(), failed: await prisma.forecastJob.findMany({
    where: { attempts: { gt: 0 } }, take: 100 }), oldest: await prisma.forecastJob.findFirst({ orderBy: { updatedAt: 'asc' } }) }); }
  catch (error) { next(error); }
});
app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2003', 'P2025'].includes(error.code)) {
    res.status(409).json({ error: 'Record conflict or missing referenced record' }); return;
  }
  if (error instanceof SyntaxError) { res.status(400).json({ error: 'Invalid request body' }); return; }
  res.status(500).json({ error: 'Internal server error' });
});
