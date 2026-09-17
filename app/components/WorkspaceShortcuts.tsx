'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BellRing, Users } from 'lucide-react';

export default function WorkspaceShortcuts() {
  const pathname = usePathname();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/auth/', { cache: 'no-store' })
      .then(response => response.json())
      .then(body => { if (active) setSignedIn(Boolean(body.user)); })
      .catch(() => { if (active) setSignedIn(false); });
    return () => { active = false; };
  }, [pathname]);

  if (!signedIn || pathname.startsWith('/demo') || pathname.startsWith('/recover')) return null;

  return <nav className="workspace-shortcuts" aria-label="Workspace shortcuts">
    {!pathname.startsWith('/people') && <Link className="workspace-shortcut" href="/people/" aria-label="Open people directory"><Users size={17}/><span>People</span></Link>}
    {!pathname.startsWith('/attention') && <Link className="workspace-shortcut" href="/attention/" aria-label="Open operational attention queue"><BellRing size={17}/><span>Operational attention</span></Link>}
  </nav>;
}
