import { NextRequest } from 'next/server';
import { AppError } from '../../../lib/server/store';
import { store } from '../../../lib/server/live-store';
import { body, failure, json } from '../../../lib/server/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization') || '';
    if (!authorization.startsWith('Bearer ') || authorization.length > 200) throw new AppError('Integration credentials are required.', 401);
    const adapterId = request.headers.get('x-caregrid-adapter') || '';
    if (adapterId.length > 100) throw new AppError('Invalid adapter ID.');
    const result = store().ingest(adapterId, authorization.slice(7), await body(request));
    return json({ accepted: true, ...result }, result.duplicate ? 200 : 201);
  } catch (error) { return failure(error); }
}
