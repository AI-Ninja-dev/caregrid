import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'CareGrid | Connected care, considered.', description: 'A demonstration workspace for connected healthcare at home.' };
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en-ZA"><body>{children}</body></html>; }
