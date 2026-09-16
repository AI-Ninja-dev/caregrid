import { NextRequest } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { AppError, hash, store } from '../../../lib/server/store';
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
    if (data.action === 'setup') {
      const setup = process.env.CAREGRID_SETUP_TOKEN;
      const local = process.env.CAREGRID_ALLOW_LOCAL_SETUP === 'true' && ['localhost', '127.0.0.1', '[::1]'].includes(request.nextUrl.hostname);
      if (!local && (!setup || !timingSafeEqual(Buffer.from(hash(String(data.setupToken || ''))), Buffer.from(hash(setup))))) throw new AppError('A workspace setup token from your server administrator is required.', 403);
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
