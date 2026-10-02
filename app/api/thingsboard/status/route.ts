import { NextRequest } from 'next/server';
import { store } from '../../../../lib/server/live-store';
import { currentUser, failure, json } from '../../../../lib/server/http';
import { AppError } from '../../../../lib/server/store';
import { adapterId } from '../../../../lib/thingsboard/telemetry';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    if (currentUser(request).role !== 'admin') throw new AppError('Administrator access is required.', 403);
    const db = store().db;
    const integration = db.prepare('SELECT enabled FROM integrations WHERE id=?').get(adapterId);
    return json({ registered: Boolean(integration), enabled: Boolean(integration?.enabled),
      restConfigured: Boolean(process.env.THINGSBOARD_URL && process.env.THINGSBOARD_USERNAME && process.env.THINGSBOARD_PASSWORD && process.env.CAREGRID_THINGSBOARD_SECRET),
      devices: db.prepare('SELECT COUNT(*) AS count FROM devices WHERE adapter_id=? AND enabled=1').get(adapterId)?.count,
      latestReceivedAt: db.prepare('SELECT MAX(received_at) AS at FROM readings JOIN devices ON devices.id=readings.device_id WHERE devices.adapter_id=?').get(adapterId)?.at || null });
  } catch (error) { return failure(error); }
}
