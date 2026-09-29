import { app } from './app.js';
import { startTelemetryWorker, stopTelemetryWorker } from './workers/telemetry.worker.js';
const server = app.listen(Number(process.env.PORT || 5000), () => {
  console.log('Server listening');
  if (process.env.DISABLE_WORKER !== 'true') void startTelemetryWorker();
});
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => {
  stopTelemetryWorker(); server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 10000).unref();
});
