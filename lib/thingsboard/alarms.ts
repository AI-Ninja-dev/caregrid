import { AppError, field, type Store } from '../server/store.ts';
import { adapterId } from './telemetry.ts';
export function migrateThingsBoard(store: Store) {
  store.db.exec(`CREATE TABLE IF NOT EXISTS thingsboard_alarms(id TEXT PRIMARY KEY,device_id TEXT NOT NULL REFERENCES devices(id),person_id TEXT NOT NULL REFERENCES people(id),type TEXT NOT NULL,severity TEXT NOT NULL,status TEXT NOT NULL,updated_ts INTEGER NOT NULL,reviewed_at TEXT,reviewed_by TEXT,payload TEXT NOT NULL);`);
}
export function ingestAlarm(store: Store, secret: string, data: Record<string, unknown>) {
  store.authenticateIntegration(adapterId, secret);
  store.limit(`thingsboard-alarms:${adapterId}`, 600, 60000);
  migrateThingsBoard(store);
  const id = field(data.alarmId, 'Alarm ID');
  const deviceId = field(data.deviceId, 'Device ID');
  if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id)) throw new AppError('Use the ThingsBoard alarm UUID.');
  const type = field(data.type, 'Alarm type');
  const severity = String(data.severity), status = String(data.status), ts = data.updatedTs;
  if (!['CRITICAL', 'MAJOR', 'MINOR', 'WARNING', 'INDETERMINATE'].includes(severity) || !['ACTIVE_UNACK', 'ACTIVE_ACK', 'CLEARED_UNACK', 'CLEARED_ACK'].includes(status)) throw new AppError('Invalid ThingsBoard alarm severity or status.');
  if (typeof ts !== 'number' || !Number.isSafeInteger(ts) || ts < 0 || ts > Date.now() + 300000) throw new AppError('Alarm update time must be Unix milliseconds.');
  return store.transaction(() => {
    const device = store.db.prepare('SELECT devices.* FROM devices JOIN people ON people.id=devices.person_id WHERE devices.id=? AND adapter_id=? AND enabled=1 AND people.active=1').get(deviceId, adapterId);
    if (!device || ts < Date.parse(String(device.created_at))) throw new AppError('Alarm requires an active, enrolled device assignment.');
    const payload = JSON.stringify({ id, deviceId, type, severity, status, ts });
    const old = store.db.prepare('SELECT * FROM thingsboard_alarms WHERE id=?').get(id);
    if (old) {
      if (old.device_id !== deviceId) throw new AppError('Alarm device cannot change.', 409);
      if (Number(old.updated_ts) > ts) return { duplicate: true, stale: true };
      if (Number(old.updated_ts) === ts) {
        if (old.payload !== payload) throw new AppError('Alarm update conflicts with an existing event.', 409);
        return { duplicate: true };
      }
    }
    store.db.prepare(`INSERT INTO thingsboard_alarms(id,device_id,person_id,type,severity,status,updated_ts,payload) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET type=excluded.type,severity=excluded.severity,status=excluded.status,updated_ts=excluded.updated_ts,payload=excluded.payload,reviewed_at=NULL,reviewed_by=NULL`).run(id, deviceId, String(device.person_id), type, severity, status, ts, payload);
    store.audit(adapterId, 'thingsboard.alarm.received', id);
    return { duplicate: false };
  });
}
