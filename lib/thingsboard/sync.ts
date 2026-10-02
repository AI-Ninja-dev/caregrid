import type { Store } from '../server/store.ts';
import { ThingsBoardClient } from './client.ts';
import { adapterId, telemetryFrames } from './telemetry.ts';
import { ingestThingsBoard } from './bridge.ts';

/** One bounded run; repeating the window is safe because ingestion is idempotent. */
export async function syncThingsBoard(store: Store, client: ThingsBoardClient, secret: string, hours = 24) {
  if (!Number.isFinite(hours) || hours <= 0 || hours > 168) throw new Error('Sync window must be between 0 and 168 hours.');
  store.authenticateIntegration(adapterId, secret);
  const devices = store.db.prepare('SELECT devices.id,devices.created_at FROM devices JOIN people ON people.id=devices.person_id WHERE adapter_id=? AND enabled=1 AND people.active=1').all(adapterId);
  let accepted = 0, duplicates = 0;
  const errors: { deviceId: string; timestamp?: number; error: string }[] = [];
  const endTs = Date.now();
  for (const device of devices) {
    const id = String(device.id);
    try {
      const startTs = Math.max(Date.parse(String(device.created_at)), endTs - hours * 3600000);
      const frames = telemetryFrames(id, await client.readings(id, startTs, endTs));
      for (const frame of frames) {
        try { const result = ingestThingsBoard(store, secret, frame); if (result.duplicate) duplicates++; else accepted++; }
        catch (error) { errors.push({ deviceId: id, timestamp: frame.ts, error: (error as Error).message }); }
      }
    } catch (error) { errors.push({ deviceId: id, error: (error as Error).message }); }
  }
  return { devices: devices.length, accepted, duplicates, errors };
}
