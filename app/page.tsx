import Link from 'next/link';
import { SectionCard } from '@/components/SectionCard';
import { ThemeToggle } from '@/components/ThemeToggle';
import type { FeatureCard } from '@/lib/types';

// Feature cards on the homepage. Keep this data simple and easy to extend.
const features: FeatureCard[] = [
  {
    title: 'Server automation',
    description: 'Manage guild protections, role rules, and moderation workflows from one modern dashboard.',
  },
  {
    title: 'Slash command control',
    description: 'Deploy Discord application commands, sync settings, and update automod policies in real time.',
  },
  {
    title: 'Discord OAuth SSO',
    description: 'Sign in securely with Discord and configure the bot for your server using role-based access.',
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#050506] text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-10">
        <header className="grid gap-6 rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/20 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.24em] text-blue-300/80">ProjectUmbrella</p>
            <h1 className="max-w-3xl text-5xl font-semibold leading-tight text-white sm:text-6xl">
              Build a powerful Discord automod and administration bot with a modern Next.js control panel.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-zinc-300">
              ProjectUmbrella brings website-driven bot configuration, Discord OAuth login, and interaction endpoint hosting on Vercel.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/dashboard"
                className="rounded-3xl bg-blue-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-400"
              >
                Open dashboard
              </Link>
              <Link
                href="/auth/signin"
                className="rounded-3xl border border-white/10 px-6 py-3 text-sm text-white transition hover:border-white/20 hover:bg-white/5"
              >
                Sign in with Discord
              </Link>
            </div>
          </div>
          <div className="flex items-center justify-center rounded-[1.75rem] bg-white/5 p-8 shadow-inner shadow-black/20">
            <div className="rounded-3xl border border-white/10 bg-[#101012] p-8 text-center">
              <p className="text-sm uppercase tracking-[0.24em] text-blue-300/80">Theme</p>
              <p className="mt-4 text-6xl">☂️</p>
              <p className="mt-4 text-zinc-300">Dark mode first, switch any time.</p>
              <div className="mt-6 flex justify-center">
                <ThemeToggle />
              </div>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-3">
          {features.map((feature) => (
            <SectionCard key={feature.title} title={feature.title} description={feature.description} />
          ))}
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/20">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-zinc-400">Integration</p>
              <h2 className="text-3xl font-semibold text-white">Axios-based REST and Discord interactions</h2>
            </div>
            <Link
              href="/dashboard"
              className="rounded-3xl bg-blue-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-400"
            >
              Start configuring
            </Link>
          </div>
          <p className="text-zinc-300 leading-7">
            The website and bot work together. Your Discord interaction endpoint handles slash commands and automod events, while the frontend calls REST APIs for settings and guild configuration.
          </p>
        </section>
      </div>
    </main>
  );
}
