import Link from 'next/link';

// Sidebar navigation for the dashboard.
const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard', label: 'Server Settings' },
  { href: '/dashboard', label: 'Automod Rules' },
  { href: '/dashboard', label: 'Command Registry' },
];

export function Sidebar() {
  return (
    <aside className="w-full max-w-xs space-y-4 rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-zinc-300 shadow-xl shadow-black/10">
      <div className="mb-6 space-y-1">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Control Center</p>
        <p className="text-lg font-semibold text-white">ProjectUmbrella</p>
      </div>
      <nav className="space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.href + item.label}
            href={item.href}
            className="block rounded-2xl px-4 py-3 text-sm transition-colors hover:bg-white/10 hover:text-white"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
