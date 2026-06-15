'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  phoneRaw: string;
  sourceLabel: string;
  createdAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) setUser(data.user);
        else router.push('/login');
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  const handleSignOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  if (loading) return <div className="crm-home"><div className="crm-bar">Loading...</div></div>;
  if (!user) return null;

  return (
    <div className="crm-home">
      <header className="crm-bar">
        <div className="crm-brand"><span className="mark">C</span> Credify</div>
        <div className="crm-user">
          <span className="crm-greet">Signed in as {user.firstName}</span>
          <button className="crm-signout" onClick={handleSignOut}>Sign out</button>
        </div>
      </header>
      <main className="crm-main">
        <span className="eyebrow">You're in</span>
        <h1>Welcome, {user.firstName}.</h1>
        <p className="crm-lead">This is a temporary home page. The CRM lives in a separate build — this confirms sign-in works end to end.</p>
        <div className="crm-card">
          <div className="row-kv"><span className="k">Name</span><span className="v">{user.firstName} {user.lastName}</span></div>
          <div className="row-kv"><span className="k">Email</span><span className="v">{user.email}</span></div>
          <div className="row-kv"><span className="k">Company</span><span className="v">{user.company}</span></div>
          <div className="row-kv"><span className="k">Phone</span><span className="v">{user.phoneRaw}</span></div>
          <div className="row-kv"><span className="k">Heard via</span><span className="v">{user.sourceLabel}</span></div>
          <div className="row-kv"><span className="k">Created</span><span className="v">{new Date(user.createdAt).toLocaleString()}</span></div>
        </div>
      </main>
    </div>
  );
}