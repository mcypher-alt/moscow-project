import { Router } from 'express';
import { z } from 'zod';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { prisma } from '../db.js';
import { authenticateJwt, requireRoles } from '../middlewares/auth.js';
import { Role } from '@prisma/client';

const router = Router();
router.use(authenticateJwt, requireRoles(Role.ADMIN));
const id = z.number().int().positive().max(2147483647);
const date = z.string().datetime({ offset: true }).transform(value => new Date(value));
const event = z.object({ id: z.string().regex(/^\d{1,19}$/).transform(BigInt)
    .refine(value => value <= 9223372036854775807n), channelId: id, recordedAt: date,
  isAlarm: z.boolean(), rawValue: z.string().max(4096).nullable().optional(),
  numericValue: z.number().finite().nullable().optional() });
const object = z.object({ id, level: z.number().int().min(0), objectKind: z.string().min(1).max(100),
  dispatcherName: z.string().min(1).max(300), parentId: id.nullable().optional(),
  address: z.string().max(500).nullable().optional(), latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
}).refine(v => (v.latitude == null) === (v.longitude == null), 'Both coordinates are required')
  .refine(v => v.parentId !== v.id, 'An object cannot be its own parent');
const channel = z.object({ id, systemObjectId: id, systemTag: z.string().max(300),
  sensorName: z.string().min(1).max(300), systemType: z.string().max(300), sensorType: z.string().max(300).nullable().optional() });
const work = z.object({ externalId: z.string().min(1).max(200), systemObjectId: id,
  status: z.string().min(1).max(100), description: z.string().max(4000),
  startsAt: date.nullable().optional(), endsAt: date.nullable().optional(),
}).refine(v => !v.startsAt || !v.endsAt || v.endsAt >= v.startsAt, 'Invalid work interval');

// XML has the same canonical contract: <batch><items><item>...</item></items></batch>.
// Reject entities/DTDs and parse only bounded payloads; no external entity expansion.
router.use((req, res, next) => {
  if (typeof req.body === 'string') {
    if (/<!DOCTYPE|<!ENTITY/i.test(req.body) || XMLValidator.validate(req.body) !== true) {
      res.status(400).json({ error: 'Invalid XML' }); return;
    }
    const parsed = new XMLParser({ processEntities: false, parseTagValue: false }).parse(req.body);
    let items = parsed.batch?.items?.item;
    items = Array.isArray(items) ? items : items ? [items] : [];
    const numeric = ['channelId', 'systemObjectId', 'level', 'parentId', 'latitude', 'longitude', 'numericValue'];
    req.body = { items: items.map((item: Record<string, unknown>) => {
      for (const key of numeric) if (typeof item[key] === 'string' && item[key] !== '') item[key] = Number(item[key]);
      if (req.path !== '/telemetry' && typeof item.id === 'string') item.id = Number(item.id);
      if (item.isAlarm === 'true' || item.isAlarm === 'false') item.isAlarm = item.isAlarm === 'true';
      return item;
    }) };
  }
  next();
});

router.post('/telemetry', async (req, res, next) => {
  const parsed = z.object({ items: z.array(event).min(1).max(5000) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  if (parsed.data.items.some(v => v.recordedAt.getTime() > Date.now() + 60000)) {
    res.status(400).json({ error: 'Future telemetry is not accepted' }); return;
  }
  try {
    const result = await prisma.$transaction(async tx => {
      const channels = await tx.sensorChannel.findMany({ where: { id: { in: parsed.data.items.map(v => v.channelId) } } });
      const known = new Set(channels.map(v => v.id));
      if (parsed.data.items.some(v => !known.has(v.channelId))) throw new Error('UNKNOWN_CHANNEL');
      // Stable IDs identify immutable measurements, not a license to discard different readings.
      const sameEvent = (a: z.infer<typeof event>, b: z.infer<typeof event>) =>
        a.channelId === b.channelId && a.recordedAt.getTime() === b.recordedAt.getTime() &&
        a.isAlarm === b.isAlarm && (a.rawValue ?? null) === (b.rawValue ?? null) &&
        (a.numericValue ?? null) === (b.numericValue ?? null);
      const incoming = new Map<bigint, z.infer<typeof event>>();
      for (const item of parsed.data.items) {
        const previous = incoming.get(item.id);
        if (previous && !sameEvent(previous, item)) throw new Error('EVENT_ID_CONFLICT');
        incoming.set(item.id, item);
      }
      const created = await tx.eventLog.createMany({ data: parsed.data.items, skipDuplicates: true });
      // Checking after INSERT also catches competing requests: INSERT waits for the
      // other unique-key transaction; this SELECT then sees its committed row.
      const stored = await tx.eventLog.findMany({ where: { id: { in: [...incoming.keys()] } } });
      if (stored.some(item => !sameEvent(item, incoming.get(item.id)!))) throw new Error('EVENT_ID_CONFLICT');
      if (created.count) for (const systemObjectId of new Set(channels.map(v => v.systemObjectId))) {
        await tx.forecastJob.upsert({ where: { systemObjectId }, create: { systemObjectId },
          update: { revision: { increment: 1 }, retryAt: new Date(), attempts: 0, lastError: null } });
      }
      return created;
    });
    res.status(202).json({ inserted: result.count, duplicates: parsed.data.items.length - result.count });
  } catch (error) {
    if (error instanceof Error && error.message === 'EVENT_ID_CONFLICT') {
      res.status(409).json({ error: 'EVENT_ID_CONFLICT', message: 'An event ID has conflicting measurements; the entire batch was rejected.' }); return;
    }
    if (error instanceof Error && error.message === 'UNKNOWN_CHANNEL') { res.status(400).json({ error: error.message }); return; }
    next(error);
  }
});
for (const kind of ['objects', 'channels', 'work-requests'] as const) {
  router.post(`/${kind}`, async (req, res, next) => {
    try {
      // Parse the complete batch before writing; transactions prevent partial imports.
      if (kind === 'objects') {
        const { items } = z.object({ items: z.array(object).min(1).max(5000) }).parse(req.body);
        await prisma.$transaction(async tx => {
          for (const { parentId: _parent, ...item } of items) await tx.systemObject.upsert({ where: { id: item.id }, create: item, update: item });
          for (const item of items) if (item.parentId !== undefined) await tx.systemObject.update({ where: { id: item.id }, data: { parentId: item.parentId } });
          const all = await tx.systemObject.findMany({ select: { id: true, parentId: true } });
          const parents = new Map(all.map(v => [v.id, v.parentId]));
          for (const item of items) {
            const seen = new Set<number>(); let current: number | null | undefined = item.id;
            while (current != null) { if (seen.has(current)) throw new Error('HIERARCHY_CYCLE'); seen.add(current); current = parents.get(current); }
          }
        });
        res.json({ imported: items.length });
      } else if (kind === 'channels') {
        const { items } = z.object({ items: z.array(channel).min(1).max(5000) }).parse(req.body);
        await prisma.$transaction(items.map(item => prisma.sensorChannel.upsert({ where: { id: item.id }, create: item, update: item })));
        res.json({ imported: items.length });
      } else {
        const { items } = z.object({ items: z.array(work).min(1).max(5000) }).parse(req.body);
        await prisma.$transaction(items.map(item => prisma.workRequest.upsert({ where: { externalId: item.externalId }, create: item, update: item })));
        res.json({ imported: items.length });
      }
    } catch (error) {
      if (error instanceof z.ZodError || (error instanceof Error && error.message === 'HIERARCHY_CYCLE')) {
        res.status(400).json({ error: error.message }); return;
      }
      next(error);
    }
  });
}
export default router;
