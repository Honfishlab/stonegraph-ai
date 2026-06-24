"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/vault", label: "Vault", icon: "🔒" },
  { href: "/vault/memories", label: "Memories", icon: "📷" },
  { href: "/vault/upload", label: "Upload", icon: "⬆️" },
  { href: "/vault/memorials", label: "Memorials", icon: "🕯️" },
  { href: "/vault/family", label: "Family", icon: "👨‍👩‍👧‍👦" },
  { href: "/vault/agent", label: "Smart Agent", icon: "🤖" },
  { href: "/vault/settings", label: "Settings", icon: "⚙️" },
  { href: "/vault/billing", label: "Billing", icon: "💳" },
];

export default function VaultSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-56 bg-stone-900 text-stone-100 flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-stone-700">
        <Link href="/vault" className="block">
          <h1 className="text-lg font-bold tracking-tight">STONEGRAPH</h1>
          <p className="text-[10px] tracking-[0.3em] text-stone-400 uppercase">
            Memory Vault
          </p>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-0.5 px-2">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/vault"
                ? pathname === "/vault"
                : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                    isActive
                      ? "bg-stone-700 text-white"
                      : "text-stone-300 hover:bg-stone-800 hover:text-white"
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-stone-700 space-y-2">
        <Link
          href="/vault/collection"
          className="block text-xs text-stone-500 hover:text-stone-300 text-center"
        >
          Wallet backup
        </Link>
        <Link
          href="/vault/myslate"
          className="block text-xs bg-stone-700 text-stone-200 py-2 rounded hover:bg-stone-600 text-center transition-colors"
        >
          Download Slate
        </Link>
        <form action="/api/auth/signout" method="POST">
          <button
            type="submit"
            className="w-full text-xs text-stone-500 hover:text-red-400 transition-colors"
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
