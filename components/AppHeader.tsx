import { ThemeToggle } from './ThemeToggle';
import { signIn, signOut, useSession } from 'next-auth/react';

// AppHeader shows authentication controls and theme toggle in the dashboard.
export function AppHeader() {
  const { status } = useSession();

  return (
    <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/10 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">ProjectUmbrella</p>
        <h1 className="text-2xl font-semibold text-white">Automod & admin control panel</h1>
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        {status === 'authenticated' ? (
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/' })}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:border-white/20 hover:bg-white/10"
          >
            Sign out
          </button>
        ) : (
          <button
            type="button"
            onClick={() => signIn('discord', { callbackUrl: '/dashboard' })}
            className="rounded-2xl border border-white/10 bg-blue-500/10 px-4 py-2 text-sm text-white transition hover:bg-blue-500/20"
          >
            Sign in
          </button>
        )}
      </div>
    </header>
  );
}
