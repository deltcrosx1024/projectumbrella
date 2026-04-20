import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function LinkedRolesPage() {
  return (
    <main className="min-h-screen bg-[#050506] px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[65vh] max-w-3xl flex-col items-center justify-center gap-6 rounded-[2rem] border border-white/10 bg-white/5 p-10 text-center shadow-xl shadow-black/20">
        <h1 className="text-3xl font-semibold">Linked Roles Verification</h1>
        <p className="max-w-xl text-zinc-300">
          Use this page as your Discord Linked Roles Verification URL. Discord can send users here to confirm that they are eligible to receive a linked role.
        </p>
        <div className="rounded-3xl border border-white/10 bg-[#09090c] p-6 text-left text-sm text-zinc-300">
          <p className="mb-2 font-semibold text-white">Verification URL</p>
          <p className="leading-7">Set your Linked Roles Verification URL to:</p>
          <code className="mt-2 inline-block rounded bg-white/5 px-2 py-1">/api/linked-roles</code>
        </div>
        <Link
          href="/auth/signin"
          className="inline-flex rounded-3xl bg-blue-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-400"
        >
          Sign in with Discord
        </Link>
      </div>
    </main>
  );
}
