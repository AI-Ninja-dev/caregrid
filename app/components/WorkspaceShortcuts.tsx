'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Activity, BellRing, Layers3, Users } from 'lucide-react';

export default function WorkspaceShortcuts() {
  const pathname = usePathname();
  const [signedIn, setSignedIn] = useState(false);
  const [attentionCount, setAttentionCount] = useState(0);

  useEffect(() => {
    let active = true;
    fetch('/api/auth/', { cache: 'no-store' })
      .then(response => response.json())
      .then(async body => {
        const authenticated = Boolean(body.user);
        if (!active) return;
        setSignedIn(authenticated);
        if (!authenticated) { setAttentionCount(0); return; }
        const workspace = await fetch('/api/workspace/', { cache: 'no-store' });
        const data = await workspace.json();
        if (active && workspace.ok) setAttentionCount(Array.isArray(data.attention) ? data.attention.length : 0);
      })
      .catch(() => { if (active) { setSignedIn(false); setAttentionCount(0); } });
    return () => { active = false; };
  }, [pathname]);

  if (!signedIn || pathname.startsWith('/demo') || pathname.startsWith('/recover')) return null;

  return <nav className="workspace-shortcuts" aria-label="Workspace shortcuts">
    {!pathname.startsWith('/people') && <Link className="workspace-shortcut" href="/people/" aria-label="Open people directory"><Users size={17}/><span>People</span></Link>}
    {!pathname.startsWith('/pathways') && <Link className="workspace-shortcut" href="/pathways/" aria-label="Open clinical pathway workload"><Activity size={17}/><span>Pathways</span></Link>}
    {!pathname.startsWith('/platform') && <Link className="workspace-shortcut" href="/platform/" aria-label="Open expanded CareGrid platform"><Layers3 size={17}/><span>Platform</span></Link>}
    {!pathname.startsWith('/attention') && <Link className="workspace-shortcut" href="/attention/" aria-label={`Open operational attention queue${attentionCount ? `, ${attentionCount} items` : ''}`}><BellRing size={17}/><span>Operational attention</span>{attentionCount > 0 && <b>{attentionCount}</b>}</Link>}
  </nav>;
}
