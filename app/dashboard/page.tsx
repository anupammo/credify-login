'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  phoneRaw: string | null;
  sourceLabel: string | null;
  createdAt: string;
}

/* ============================================================
   CONFIG — swap each href for the real backend route when
   modules go live; nothing else needs to change.
   ============================================================ */
const MODULES = [
  { id: 'crm',       name: 'CRM',          desc: 'Leads, contacts, and email cadences.',        href: '/crm',       icon: 'users' },
  { id: 'forms',     name: 'Form Builder', desc: 'Intake forms and validated screeners.',       href: '/forms',     icon: 'clipboard' },
  { id: 'reports',   name: 'Reports',      desc: 'Dashboards and analytics for your practice.', href: '/reports',   icon: 'chart' },
  { id: 'invoicing', name: 'Invoicing',    desc: 'Create and send credentialing invoices.',     href: '/invoicing', icon: 'invoice' },
] as const;

const ICONS: Record<string, React.ReactNode> = {
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9.5" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
  ),
  clipboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="8" y1="16" x2="13" y2="16" /></svg>
  ),
  chart: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="21" y2="21" /><rect x="6" y="11" width="3" height="7" rx="1" /><rect x="11" y="6" width="3" height="12" rx="1" /><rect x="16" y="14" width="3" height="4" rx="1" /></svg>
  ),
  invoice: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="12" x2="12" y2="18" /><path d="M14 13.2c0-.8-.9-1.4-2-1.4s-2 .6-2 1.4.9 1.4 2 1.4 2 .6 2 1.4-.9 1.4-2 1.4-2-.6-2-1.4" /></svg>
  ),
  arrow: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
  ),
};

const PANEL_CSS = `
.cdash {
  --brand:#0a3d2b; --primary:#1a8a66; --accent:#22a87e; --accent-2:#3dbd94;
  --mint:#edfaf4; --mint-2:#d4f4e8; --ink:#0d1f18; --muted:#527060; --muted-2:#8aaa9a;
  --surface:#f4f7f5; --border:#dde8e3; --white:#ffffff;
  --serif:var(--font-instrument-serif),Georgia,serif;
  --sans:var(--font-sora),-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  --radius:12px; --radius-sm:9px;
  --shadow-lift:0 1px 2px rgba(10,61,43,.05),0 10px 26px -14px rgba(10,61,43,.30);
  position:relative; min-height:100vh;
  font-family:var(--sans); color:var(--ink); background:var(--surface);
  -webkit-font-smoothing:antialiased; text-rendering:optimizeLegibility;
}
.cdash *, .cdash *::before, .cdash *::after { box-sizing:border-box; }
.cdash::before {
  content:""; position:fixed; top:-170px; right:-150px; width:540px; height:540px; z-index:0;
  background:radial-gradient(circle,rgba(61,189,148,.14) 0%,rgba(61,189,148,0) 70%); pointer-events:none;
}
.cdash .page { position:relative; z-index:1; min-height:100vh; display:flex; flex-direction:column; }
.cdash .bar { position:sticky; top:0; z-index:10; display:flex; align-items:center; justify-content:space-between; padding:16px 28px; background:var(--white); border-bottom:1px solid var(--border); }
.cdash .lockup { display:inline-flex; align-items:center; gap:11px; }
.cdash .lockup .ring { display:grid; place-items:center; width:32px; height:32px; color:var(--primary); flex:none; }
.cdash .lockup .ring svg { width:32px; height:32px; }
.cdash .lockup .word { font-family:var(--serif); font-size:23px; letter-spacing:.3px; color:var(--ink); }
.cdash .signout { display:inline-flex; align-items:center; gap:7px; font-family:var(--sans); font-size:13px; font-weight:600; color:var(--brand); background:var(--mint); border:1px solid var(--mint-2); padding:8px 16px; border-radius:var(--radius-sm); cursor:pointer; transition:background .16s ease,transform .16s ease; }
.cdash .signout svg { width:15px; height:15px; }
.cdash .signout:hover { background:var(--mint-2); }
.cdash .signout:active { transform:translateY(1px); }
.cdash .signout:disabled { opacity:.6; cursor:default; }
.cdash .workspace { flex:1; width:100%; max-width:880px; margin:0 auto; padding:56px 28px 76px; }
.cdash .welcome { margin-bottom:34px; }
.cdash .eyebrow { display:inline-block; font-size:10.5px; font-weight:600; letter-spacing:1.5px; text-transform:uppercase; color:var(--primary); background:var(--mint); border:1px solid var(--mint-2); padding:5px 11px; border-radius:999px; }
.cdash .welcome h1 { font-family:var(--serif); font-weight:400; font-size:42px; line-height:1.08; margin:14px 0 8px; color:var(--ink); }
.cdash .welcome .lead { margin:0; font-size:15px; color:var(--muted); line-height:1.6; max-width:520px; }
.cdash .mod-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:18px; }
.cdash .mod-card { display:flex; align-items:center; gap:16px; padding:20px 22px; background:var(--white); border:1px solid var(--border); border-radius:var(--radius); box-shadow:var(--shadow-lift); text-decoration:none; color:var(--ink); cursor:pointer; transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease,background .16s ease; }
.cdash .mod-card:hover { transform:translateY(-2px); box-shadow:0 1px 2px rgba(10,61,43,.05),0 18px 38px -18px rgba(10,61,43,.42); border-color:var(--accent-2); background:#fbfdfc; }
.cdash .mod-card:active { transform:translateY(0); }
.cdash .mod-card:focus-visible { outline:none; border-color:var(--accent); box-shadow:0 0 0 3px rgba(34,168,126,.16); }
.cdash .mod-ico { display:grid; place-items:center; width:46px; height:46px; border-radius:12px; background:var(--mint); color:var(--primary); flex:none; }
.cdash .mod-ico svg { width:23px; height:23px; }
.cdash .mod-body { flex:1; min-width:0; display:flex; flex-direction:column; gap:3px; }
.cdash .mod-name { font-size:16px; font-weight:600; color:var(--ink); }
.cdash .mod-desc { font-size:13px; color:var(--muted); line-height:1.45; }
.cdash .mod-arrow { flex:none; color:var(--muted-2); transition:transform .16s ease,color .16s ease; }
.cdash .mod-card:hover .mod-arrow { transform:translateX(3px); color:var(--primary); }
.cdash a:focus-visible, .cdash button:focus-visible { outline-offset:2px; }
@media (max-width:880px) {
  .cdash .bar { padding:14px 18px; }
  .cdash .workspace { padding:38px 18px 56px; }
  .cdash .welcome h1 { font-size:36px; }
  .cdash .mod-grid { grid-template-columns:1fr; gap:14px; }
}
@media (prefers-reduced-motion:reduce) {
  .cdash *, .cdash *::before, .cdash *::after { animation:none !important; transition:none !important; }
}
`;

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then(async (data) => {
        if (data.user) {
          setUser(data.user);
          setLoading(false);
        } else {
          // Token is missing/invalid or its user no longer exists. Clear the
          // stale cookie so the proxy doesn't bounce us straight back here.
          await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
          window.location.assign('/login');
        }
      })
      .catch(() => {
        window.location.assign('/login');
      });
  }, [router]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      // Clear the session cookie first, then leave the app.
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      /* fall through to redirect regardless */
    }
    // Hard navigation so the cleared cookie is re-evaluated by middleware.
    window.location.assign('/login');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: '#527060', fontFamily: 'var(--font-sora), sans-serif' }}>
        Loading…
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="cdash">
      <style dangerouslySetInnerHTML={{ __html: PANEL_CSS }} />
      <div className="page">
        {/* ====== Top bar ====== */}
        <header className="bar">
          <div className="lockup">
            <span className="ring" aria-hidden="true">
              <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="24" cy="24" r="22" strokeWidth="1.2" opacity=".45" />
                <circle cx="24" cy="24" r="17" strokeWidth="1.6" />
                <polyline points="16 24.5 21.5 30 32 19" strokeWidth="2.2" />
              </svg>
            </span>
            <span className="word">Credify</span>
          </div>

          <button type="button" className="signout" onClick={handleSignOut} disabled={signingOut}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </header>

        {/* ====== Workspace ====== */}
        <main className="workspace">
          <div className="welcome">
            <span className="eyebrow">Your workspace</span>
            <h1>Welcome back{user.firstName ? `, ${user.firstName}` : ''}.</h1>
            <p className="lead">Pick a module to get started. Everything in your Credify suite, one tap away.</p>
          </div>

          <div className="mod-grid">
            {MODULES.map((m) => (
              <a key={m.id} className="mod-card" data-module={m.id} href={m.href}>
                <span className="mod-ico" aria-hidden="true">{ICONS[m.icon]}</span>
                <span className="mod-body">
                  <span className="mod-name">{m.name}</span>
                  <span className="mod-desc">{m.desc}</span>
                </span>
                <span className="mod-arrow" aria-hidden="true">{ICONS.arrow}</span>
              </a>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
