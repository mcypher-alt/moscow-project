import { Router } from 'express';
import { prisma } from '../db.js';
import { authenticateJwt, requireRoles } from '../middlewares/auth.js';
import { buildMaintenance, recommendationVersion } from '../services/maintenance.js';

const router = Router();
router.use(authenticateJwt);
router.get('/', async (_req, res, next) => {
  try {
    const objects = await prisma.systemObject.findMany({ orderBy: { id: 'asc' }, include: {
      incidents: { where: { status: { in: ['OPEN', 'IN_PROGRESS', 'CONFIRMED'] } }, orderBy: { createdAt: 'desc' } },
      forecasts: { take: 1, orderBy: [{ evaluatedAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }] }, _count: { select: { channels: true } },
      channels: { select: { id: true, sensorName: true, systemTag: true, systemType: true, sensorType: true } },
    } });
    res.json(objects);
  } catch (error) { next(error); }
});
router.get('/:id/maintenance', async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) { res.status(400).json({ error: 'Invalid object ID' }); return; }
  try {
    const object = await prisma.systemObject.findUnique({ where: { id }, include: {
      channels: { orderBy: { id: 'asc' }, include: { events: { orderBy: [{ recordedAt: 'desc' }, { id: 'desc' }], take: 1 } } },
      forecasts: { take: 1, orderBy: [{ evaluatedAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }] },
    } });
    if (!object) { res.status(404).json({ error: 'Object not found' }); return; }
    res.json(buildMaintenance(object));
  } catch (error) { next(error); }
});
router.get('/:id/repair-drafts', async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) { res.status(400).json({ error: 'Invalid object ID' }); return; }
  try { res.json(await prisma.repairDraft.findMany({ where: { systemObjectId: id }, orderBy: { createdAt: 'desc' }, take: 50 })); }
  catch (error) { next(error); }
});
router.post('/:id/repair-drafts', requireRoles('DISPATCHER', 'ADMIN'), async (req, res, next) => {
  const id = Number(req.params.id);
  const { content, version } = req.body ?? {};
  if (!Number.isSafeInteger(id) || id < 1 || typeof content !== 'string' || !content.trim() || content.length > 200000 || version !== recommendationVersion) {
    res.status(400).json({ error: 'Invalid repair draft' }); return;
  }
  try {
    if (!await prisma.systemObject.findUnique({ where: { id }, select: { id: true } })) { res.status(404).json({ error: 'Object not found' }); return; }
    res.status(201).json(await prisma.repairDraft.create({ data: { systemObjectId: id, userId: req.user!.id, content: content.trim(), recommendationVersion: version } }));
  } catch (error) { next(error); }
});
router.get('/:id', async (req, res, next) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id)) { res.status(400).json({ error: 'Invalid object ID' }); return; }
  try {
    const object = await prisma.systemObject.findUnique({ where: { id }, include: {
      channels: { include: { events: { orderBy: { recordedAt: 'desc' }, take: 1 } } },
      incidents: { orderBy: { createdAt: 'desc' }, take: 100, include: { actions: true } },
      forecasts: { orderBy: [{ evaluatedAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }], take: 24 }, workRequests: true,
    } });
    if (!object) { res.status(404).json({ error: 'Object not found' }); return; }
    res.json(object);
  } catch (error) { next(error); }
});
export default router;
