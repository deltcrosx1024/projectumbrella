export const dynamic = 'force-dynamic';

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#050506] px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[65vh] max-w-3xl flex-col gap-6 rounded-[2rem] border border-white/10 bg-white/5 p-10 shadow-xl shadow-black/20">
        <h1 className="text-3xl font-semibold">Privacy Policy</h1>
        <p className="text-zinc-300 leading-7">
          ProjectUmbrella collects only the data needed for Discord OAuth authentication and bot integration. API tokens and secrets are stored in server-side environment variables and are never sent to the browser.
        </p>
        <section className="space-y-4 rounded-3xl border border-white/10 bg-[#09090c] p-6 text-zinc-300">
          <h2 className="text-xl font-semibold text-white">Data Handling</h2>
          <p>
            Discord account data is used to identify users, determine guild membership, and authorize linked roles. No personal data is sold or shared outside of the Discord integration.
          </p>
          <h2 className="text-xl font-semibold text-white">Security</h2>
          <p>
            Always keep your Discord client secret and bot token private. Use environment variables and server-side routes to avoid exposing credentials in the frontend.
          </p>
        </section>
      </div>
    </main>
  );
}
