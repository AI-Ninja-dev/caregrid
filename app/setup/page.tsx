'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { Activity } from 'lucide-react';

export default function SetupPage() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/auth/', { cache: 'no-store' })
      .then(response => response.json())
      .then(body => {
        setConfigured(Boolean(body.configured));
        if (body.user) window.location.href = '/dashboard/';
      })
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
        body: JSON.stringify({ action: 'setup', ...fields }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Could not create administrator.');
      window.location.href = '/dashboard/';
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not create administrator.');
    } finally {
      setBusy(false);
    }
  }

  if (configured === true) return <main className="auth-page"><section className="panel auth-panel"><span className="brand"><Activity/> CareGrid</span><h1>CareGrid is already set up.</h1><p>The first administrator already exists.</p><Link className="primary" href="/login/">Go to sign in</Link><p className="muted"><Link href="/demo/">Continue as guest</Link></p></section></main>;

  return <main className="auth-page">
    <section className="panel auth-panel">
      <span className="brand"><Activity/> CareGrid</span>
      <span className="eyebrow">FIRST ADMINISTRATOR</span>
      <h1>Create your CareGrid administrator.</h1>
      <p>No server setup token is required. Choose the email and password you want to use for administration.</p>
      {message && <p className="live-notice" role="status">{message}</p>}
      <form className="live-form" onSubmit={submit}>
        <label className="field">Email<input name="email" type="email" required autoComplete="email"/></label>
        <label className="field">Password · at least 14 characters<input name="password" type="password" required minLength={14} autoComplete="new-password"/></label>
        <button className="primary" disabled={busy}>{busy ? 'Creating…' : 'Create administrator'}</button>
      </form>
      <p className="muted"><Link href="/demo/">Continue as guest — no login required</Link></p>
    </section>
  </main>;
}
