'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { Activity } from 'lucide-react';

export default function LoginPage() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/auth/', { cache: 'no-store' })
      .then(response => response.json())
      .then(body => setConfigured(Boolean(body.configured)))
      .catch(() => setConfigured(null));
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch('/api/auth/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', ...fields }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Could not sign in.');
      window.location.href = '/';
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  }

  return <main className="auth-page">
    <section className="panel auth-panel">
      <span className="brand"><Activity/> CareGrid</span>
      <span className="eyebrow">CARE TEAM ACCESS</span>
      <h1>Sign in to CareGrid.</h1>
      <p>Use your CareGrid email address and password.</p>
      {message && <p className="live-notice" role="status">{message}</p>}
      <form className="live-form" onSubmit={submit}>
        <label className="field">Email<input name="email" type="email" required autoComplete="email"/></label>
        <label className="field">Password<input name="password" type="password" required minLength={14} autoComplete="current-password"/></label>
        <button className="primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
      {configured === false && <p className="muted">No administrator exists yet. <Link href="/setup/">Create the first administrator</Link>.</p>}
      <p className="muted">Just exploring? <Link href="/demo/">Continue as guest — no login required</Link>.</p>
    </section>
  </main>;
}
