'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';

export default function SignInPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    setIsLoading(true);
    await signIn('discord', { callbackUrl: '/dashboard' });
  };

  return (
    <main className="min-h-screen bg-[#050506] px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[65vh] max-w-3xl flex-col items-center justify-center gap-6 rounded-[2rem] border border-white/10 bg-white/5 p-10 text-center shadow-xl shadow-black/20">
        <h1 className="text-3xl font-semibold">Continue with Discord</h1>
        <p className="max-w-xl text-zinc-300">
          Click the button below to authenticate with Discord. NextAuth will redirect you back to the dashboard on success.
        </p>
        <button
          onClick={handleSignIn}
          disabled={isLoading}
          className="inline-flex rounded-3xl bg-blue-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:opacity-50"
        >
          {isLoading ? 'Signing in...' : 'Sign in with Discord'}
        </button>
      </div>
    </main>
  );
}
