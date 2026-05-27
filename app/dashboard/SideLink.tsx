"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export default function SideLink({
  href,
  icon,
  label,
  exact,
}: {
  href: string;
  icon: ReactNode;
  label: string;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const isActive = exact ? pathname === href : pathname?.startsWith(href);

  return (
    <Link href={href} className={"aa-side-link " + (isActive ? "is-active" : "")}>
      <span className="aa-side-icon">{icon}</span>
      {label}
    </Link>
  );
}
