import { NextRequest } from 'next/server';
import { AppError } from '../../../../lib/server/store';
import { store } from '../../../../lib/server/live-store';
import { body, failure, json } from '../../../../lib/server/http';
import { ingestThingsBoard } from '../../../../lib/thingsboard/bridge';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  try {
    const auth = request.headers.get('authorization') || '';
    if (!auth.startsWith('Bearer ') || auth.length > 200) throw new AppError('Integration credentials are required.', 401);
    const result = ingestThingsBoard(store(), auth.slice(7), await body(request));
    return json({ accepted: true, ...result }, result.duplicate ? 200 : 201);
  } catch (error) { return failure(error); }
}
