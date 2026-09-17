import type { Metadata } from 'next';
import './globals.css';
import './clinical.css';
export const metadata: Metadata = { title: 'CareGrid | Connected care, considered.', description: 'A connected-care workspace for healthcare at home.' };
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en-ZA"><body>{children}</body></html>; }
