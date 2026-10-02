import { NextRequest } from 'next/server';
import { store } from '../../../../lib/server/live-store';
import { AppError, field } from '../../../../lib/server/store';
import { body, currentUser, failure, json, sameOrigin } from '../../../../lib/server/http';
import { ingestAlarm, migrateThingsBoard } from '../../../../lib/thingsboard/alarms';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  try {
    const auth = request.headers.get('authorization') || '';
    if (!auth.startsWith('Bearer ') || auth.length > 200) throw new AppError('Integration credentials are required.', 401);
    const result = ingestAlarm(store(), auth.slice(7), await body(request));
    return json({ accepted: true, ...result }, result.duplicate ? 200 : 201);
  } catch (error) { return failure(error); }
}
export async function PATCH(request: NextRequest) {
  try {
    sameOrigin(request); const user = currentUser(request); const data = await body(request); const s = store(); migrateThingsBoard(s);
    const id = field(data.id, 'Alarm ID');
    if (!Number.isSafeInteger(data.updatedTs)) throw new AppError('Alarm version is required.');
    s.transaction(() => {
      if (!s.db.prepare('UPDATE thingsboard_alarms SET reviewed_at=?,reviewed_by=? WHERE id=? AND updated_ts=? AND reviewed_at IS NULL').run(new Date().toISOString(), user.id, id, Number(data.updatedTs)).changes) throw new AppError('Alarm changed or was already reviewed. Refresh before continuing.', 409);
      s.audit(user.id, 'thingsboard.alarm.reviewed', id);
    });
    return json({ reviewed: true });
  } catch (error) { return failure(error); }
}
