import { json, failure } from '../../../lib/server/http';
import { store } from '../../../lib/server/live-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    store().db.prepare('SELECT 1 AS ok').get();
    return json({ status: 'ok', database: 'reachable' });
  } catch (error) {
    return failure(error);
  }
}
