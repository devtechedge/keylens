import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

export interface HeaderNavItem {
  href: string;
  label: string;
}

const DEFAULT_NAV: HeaderNavItem[] = [
  { href: "/pricing", label: "Pricing" },
];

export function Header({
  brand,
  orgName,
  demo,
  nav,
}: {
  brand?: string;
  orgName?: string;
  demo?: boolean;
  nav?: HeaderNavItem[];
}) {
  const merged: HeaderNavItem[] = [];
  for (const item of [...DEFAULT_NAV, ...(nav ?? [])]) {
    if (!merged.some((m) => m.href === item.href)) merged.push(item);
  }
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            aria-label="KeyLens home"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-sm transition-transform duration-200 hover:scale-105"
          >
            KL
          </Link>
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
              {orgName ?? brand ?? "KeyLens"}
            </span>
            {demo && (
              <span className="shrink-0 rounded-full bg-indigo-500/15 px-2 py-0.5 text-[11px] font-medium text-indigo-600 ring-1 ring-indigo-500/30 dark:text-indigo-300 dark:ring-indigo-400/30">
                Demo data
              </span>
            )}
          </div>
        </div>
        <nav className="flex items-center gap-1 text-sm">
          {merged.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-1.5 text-slate-500 transition hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-200"
            >
              {item.label}
            </Link>
          ))}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
