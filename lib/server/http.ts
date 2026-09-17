import { NextRequest, NextResponse } from 'next/server';
import { AppError } from './store';
import { store } from './live-store';
export const sessionCookie = 'caregrid_session';
export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}
export function failure(error: unknown) {
  return json({ error: error instanceof AppError ? error.message : 'The request could not be completed. Please try again.' }, error instanceof AppError ? error.status : 500);
}
export function sameOrigin(request: NextRequest) {
  const expected = process.env.CAREGRID_ORIGIN || request.nextUrl.origin;
  if (request.headers.get('origin') !== expected) throw new AppError('Request origin is not allowed.', 403);
}
export function currentUser(request: NextRequest) {
  const user = store().user(request.cookies.get(sessionCookie)?.value || '');
  if (!user) throw new AppError('Please sign in.', 401);
  return user;
}
export async function body(request: NextRequest): Promise<Record<string, unknown>> {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new AppError('Send JSON content.', 415);
  if (Number(request.headers.get('content-length')) > 16384) throw new AppError('Request is too large.', 413);
  const reader = request.body?.getReader();
  if (!reader) throw new AppError('A request body is required.');
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.length;
    if (size > 16384) { await reader.cancel(); throw new AppError('Request is too large.', 413); }
    chunks.push(value);
  }
  let value;
  try { value = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new AppError('Invalid JSON.'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new AppError('A JSON object is required.');
  return value;
}
