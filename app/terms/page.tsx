export const dynamic = 'force-dynamic';

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#050506] px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[65vh] max-w-3xl flex-col gap-6 rounded-[2rem] border border-white/10 bg-white/5 p-10 shadow-xl shadow-black/20">
        <h1 className="text-3xl font-semibold">Terms of Service</h1>
        <p className="text-zinc-300 leading-7">
          These Terms of Service apply to the ProjectUmbrella application and related Discord integration features. By using this service, you agree to comply with Discord's API Terms of Service and the usage policies for bots and OAuth.
        </p>
        <section className="space-y-4 rounded-3xl border border-white/10 bg-[#09090c] p-6 text-zinc-300">
          <h2 className="text-xl font-semibold text-white">Usage</h2>
          <p>
            You may use ProjectUmbrella to manage your Discord server, automate moderation workflows, and authorize users through Discord OAuth. Do not use these features for abusive or malicious activity.
          </p>
          <h2 className="text-xl font-semibold text-white">Privacy</h2>
          <p>
            Only the data required for authentication, role verification, and bot integration is stored or processed. Sensitive values like bot tokens are kept in environment configuration and never exposed client-side.
          </p>
        </section>
      </div>
    </main>
  );
}
