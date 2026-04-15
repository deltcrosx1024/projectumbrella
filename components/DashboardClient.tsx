'use client';

import { useEffect, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { Sidebar } from '@/components/Sidebar';
import { SectionCard } from '@/components/SectionCard';
import { AppHeader } from '@/components/AppHeader';
import { fetchDiscordSettings, saveDiscordSettings } from '@/lib/api/settings';
import type { DiscordConfig } from '@/lib/types';

// Default client settings for the dashboard form. Update this shape when adding new config options.
const defaultConfig: DiscordConfig = {
  guildId: '',
  autoModEnabled: true,
  moderationLevel: 'medium',
  safeWords: ['spam', 'scam'],
  adminRoleId: '',
};

export function DashboardClient() {
  const { status } = useSession();
  const [config, setConfig] = useState<DiscordConfig>(defaultConfig);
  const [message, setMessage] = useState('');

  const updateConfig = <K extends keyof DiscordConfig>(key: K, value: DiscordConfig[K]) => {
    setConfig((previous) => ({ ...previous, [key]: value }));
  };

  const updateSafeWords = (value: string) => {
    setConfig((previous) => ({
      ...previous,
      safeWords: value.split(',').map((item) => item.trim()).filter(Boolean),
    }));
  };

  useEffect(() => {
    // Fetch existing bot settings only after authentication.
    if (status !== 'authenticated') return;

    fetchDiscordSettings()
      .then(setConfig)
      .catch(() => setMessage('Unable to load settings.'));
  }, [status]);

  const handleSave = async () => {
    setMessage('Saving settings...');

    try {
      const saved = await saveDiscordSettings(config);
      setConfig(saved);
      setMessage('Settings saved successfully.');
    } catch {
      setMessage('Unable to save settings.');
    }
  };

  if (status === 'loading') {
    return (
      <main className="min-h-screen bg-[#050506] px-6 py-10 text-white">
        <div className="mx-auto max-w-6xl">Loading your dashboard…</div>
      </main>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <main className="min-h-screen bg-[#050506] px-6 py-10 text-white">
        <div className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center gap-6 rounded-[2rem] border border-white/10 bg-white/5 p-10 text-center shadow-xl shadow-black/20">
          <h1 className="text-3xl font-semibold">Sign in to manage ProjectUmbrella</h1>
          <p className="max-w-lg text-zinc-300">Authenticate with Discord to control auto-mod rules, server administration, and command deployment.</p>
          <button
            type="button"
            onClick={() => signIn('discord', { callbackUrl: '/dashboard' })}
            className="rounded-3xl bg-blue-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-400"
          >
            Sign in with Discord
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050506] px-6 py-10 text-white">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[280px_1fr]">
        <Sidebar />
        <div className="space-y-8">
          <AppHeader />
          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard
              title="Server configuration"
              description="Link a guild, choose moderation levels, and keep your community safe with templated automod rules."
            >
              <div className="space-y-3">
                <label className="block text-sm text-zinc-300">
                  <span>Server ID</span>
                  <input
                    value={config.guildId}
                    onChange={(event) => updateConfig('guildId', event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-[#070708] px-4 py-3 text-white outline-none focus:border-blue-400"
                    placeholder="Enter guild ID"
                  />
                </label>
                <label className="block text-sm text-zinc-300">
                  <span>Admin role ID</span>
                  <input
                    value={config.adminRoleId}
                    onChange={(event) => updateConfig('adminRoleId', event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-[#070708] px-4 py-3 text-white outline-none focus:border-blue-400"
                    placeholder="Enter admin role ID"
                  />
                </label>
              </div>
            </SectionCard>
            <SectionCard
              title="Automod rules"
              description="Enable or disable auto moderation, then tune rules to the exact level you want."
            >
              <div className="space-y-3">
                <label className="flex items-center gap-3 text-sm text-zinc-300">
                  <input
                    type="checkbox"
                    checked={config.autoModEnabled}
                    onChange={(event) => updateConfig('autoModEnabled', event.target.checked)}
                    className="h-5 w-5 rounded border-white/10 bg-[#070708] text-blue-400"
                  />
                  <span>Auto moderation enabled</span>
                </label>
                <label className="block text-sm text-zinc-300">
                  <span>Moderation level</span>
                  <select
                    value={config.moderationLevel}
                    onChange={(event) => updateConfig('moderationLevel', event.target.value as DiscordConfig['moderationLevel'])}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-[#070708] px-4 py-3 text-white outline-none focus:border-blue-400"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </label>
              </div>
            </SectionCard>
            <SectionCard
              title="Safe words & filters"
              description="Build the list of words and patterns the bot will watch for in your server."
            >
              <textarea
                value={config.safeWords.join(', ')}
                onChange={(event) => updateSafeWords(event.target.value)}
                rows={4}
                className="min-h-[140px] w-full rounded-3xl border border-white/10 bg-[#070708] px-4 py-4 text-sm text-white outline-none focus:border-blue-400"
                placeholder="spam, scam, phishing"
              />
            </SectionCard>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-black/10">
              <div className="mb-4 text-sm uppercase tracking-[0.24em] text-zinc-500">Status</div>
              <p className="text-sm leading-7 text-zinc-300">Use the button below to persist changes to your Discord configuration.</p>
              <button
                type="button"
                onClick={handleSave}
                className="mt-6 w-full rounded-3xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-400"
              >
                Save configuration
              </button>
              {message ? <p className="mt-4 text-sm text-blue-200">{message}</p> : null}
            </div>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <SectionCard
              title="Command sync"
              description="Register slash commands for your guild and keep them aligned to the web dashboard."
            />
            <SectionCard
              title="Moderation reports"
              description="Review actions, blocked messages, and event summaries from the bot in one place."
            />
            <SectionCard
              title="Server audit"
              description="Maintain trust with fast role, permission, and moderation checks for each configuration update."
            />
          </div>
        </div>
      </div>
    </main>
  );
}
