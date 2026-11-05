"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function PanelNav({ items }: { items: { href: string; label: string; badge?: number }[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto lg:flex-col">
      {items.map((item) => {
        const active = item.href === pathname || (item.href !== items[0].href && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center justify-between gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${
              active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {item.label}
            {item.badge ? <span className="badge bg-brand-600 text-white">{item.badge}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
