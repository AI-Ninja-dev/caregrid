import { NextRequest } from 'next/server';
import { store } from '../../../lib/server/live-store';
import { body, currentUser, failure, json, sameOrigin } from '../../../lib/server/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try { return json(store().snapshot(currentUser(request))); } catch (error) { return failure(error); }
}
export async function POST(request: NextRequest) {
  try { sameOrigin(request); const user = currentUser(request); return json(store().mutate(user, await body(request))); } catch (error) { return failure(error); }
}
