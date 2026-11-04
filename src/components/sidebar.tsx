"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/opportunities", label: "Opportunities" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/evidence", label: "Evidence" },
  { href: "/brand", label: "Brand" },
  { href: "/recommenders", label: "Recommenders" },
  { href: "/profile", label: "Profile & Sources" },
  { href: "/triage", label: "Triage" },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="border-b border-zinc-200 p-4 dark:border-zinc-800 md:w-56 md:border-b-0 md:border-r">
      <div className="mb-4 text-lg font-semibold">EB-1A Tracker</div>
      <nav className="flex gap-1 md:flex-col">
        {NAV.map((n) => {
          const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={clsx(
                "rounded px-3 py-2 text-sm",
                active
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "hover:bg-zinc-100 dark:hover:bg-zinc-800",
              )}
            >
              {n.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
