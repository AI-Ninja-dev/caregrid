import { NextRequest } from 'next/server';
import { AppError } from '../../../lib/server/store';
import { store } from '../../../lib/server/live-store';
import { body, failure, json, sameOrigin, sessionCookie } from '../../../lib/server/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try { return json({ configured: store().configured(), user: store().user(request.cookies.get(sessionCookie)?.value || '') || null }); } catch (error) { return failure(error); }
}
export async function POST(request: NextRequest) {
  try {
    sameOrigin(request);
    const data = await body(request);
    if (data.action === 'recover') { store().recover(data.recoveryToken, data.password); return json({ ok: true }); }
    if (data.action === 'setup') {
      store().setup(data.email, data.password);
    } else if (data.action !== 'login') throw new AppError('Unsupported authentication action.');
    const session = store().login(data.email, data.password);
    const response = json({ ok: true });
    response.cookies.set(sessionCookie, session, { httpOnly: true, sameSite: 'strict', secure: request.nextUrl.protocol === 'https:' || process.env.CAREGRID_ORIGIN?.startsWith('https://'), path: '/', maxAge: 8 * 3600 });
    return response;
  } catch (error) { return failure(error); }
}
export async function DELETE(request: NextRequest) {
  try { sameOrigin(request); store().logout(request.cookies.get(sessionCookie)?.value || ''); const response = json({ ok: true }); response.cookies.set(sessionCookie, '', { path: '/', maxAge: 0 }); return response; } catch (error) { return failure(error); }
}
