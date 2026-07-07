"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SubNav({ projectId }: { projectId: number }) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;
  const tabs = [
    { href: base, label: "Overview" },
    { href: `${base}/budget`, label: "Budget" },
    { href: `${base}/transactions`, label: "Transactions" },
    { href: `${base}/draws`, label: "Draws" },
    { href: `${base}/photos`, label: "Photos" },
    { href: `${base}/comps`, label: "Comps" },
    { href: `${base}/report`, label: "Report" },
  ];
  return (
    <nav className="subnav no-print" aria-label="Project sections">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} className={pathname === t.href ? "active" : ""}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
