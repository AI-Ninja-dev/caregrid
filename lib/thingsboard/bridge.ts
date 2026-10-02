import { AppError, type Store } from '../server/store.ts';
import { adapterId, normalizeTelemetry, type Kind } from './telemetry.ts';

export function ingestThingsBoard(store: Store, secret: string, input: unknown) {
  store.authenticateIntegration(adapterId, secret);
  const deviceId = input && typeof input === 'object' ? (input as Record<string, unknown>).deviceId : undefined;
  if (typeof deviceId !== 'string') throw new AppError('Device UUID is required.');
  const device = store.db.prepare('SELECT kind FROM devices WHERE id=? AND adapter_id=? AND enabled=1').get(deviceId, adapterId);
  if (!device) throw new AppError('Register and assign this ThingsBoard device before sending telemetry.', 404);
  let reading;
  try { reading = normalizeTelemetry(input, String(device.kind) as Kind); }
  catch (error) { throw new AppError((error as Error).message); }
  return store.ingest(adapterId, secret, reading);
}
