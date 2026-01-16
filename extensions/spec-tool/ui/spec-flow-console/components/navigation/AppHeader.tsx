"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/" },
  { label: "About", href: "/about" },
];

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link
          href="/"
          className="font-semibold tracking-[0.2em] text-xs uppercase text-slate-200 md:text-sm"
        >
          Swarm Workflow
        </Link>

        <nav className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-1 py-1">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === item.href
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium transition",
                  isActive
                    ? "bg-indigo-500 text-white shadow-[0_0_25px_rgba(99,102,241,0.45)]"
                    : "text-slate-300 hover:text-white"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden text-right text-xs leading-tight text-slate-400 md:block">
          <p className="font-mono uppercase tracking-[0.3em] text-indigo-300">
            Capture · Clarify · Close
          </p>
          <p>Live data refreshes every 5s while focused</p>
        </div>
      </div>
    </header>
  );
}
