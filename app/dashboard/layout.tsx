"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand, Icon } from "../_ui/icons";
import type { ReactNode } from "react";

const navItems: { href: string; label: string; icon: () => ReactNode }[] = [
  { href: "/dashboard",            label: "Overview",            icon: Icon.grid    },
  { href: "/dashboard/sync",       label: "LeetCode Sync",       icon: Icon.trend   },
  { href: "/dashboard/contest",    label: "Custom Contest",      icon: Icon.clock   },
  { href: "/dashboard/upsolving",  label: "Upsolving Queue",     icon: Icon.shield  },
  { href: "/dashboard/analysis",   label: "AI Analysis",         icon: Icon.spark   },
  { href: "/dashboard/complexity", label: "Complexity Analyzer", icon: Icon.code    },
  { href: "/dashboard/practice",   label: "Practice",            icon: Icon.terminal},
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="aa-dash">
      <aside className="aa-side">
        <Link href="/" className="aa-side-brand"><Brand /></Link>
        <div className="aa-side-nav">
          {navItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={"aa-side-link " + (isActive ? "is-active" : "")}
              >
                <span className="aa-side-icon">{item.icon()}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
        <div className="aa-side-foot">
          <Link href="/api/auth/signout" className="aa-side-link">
            <span className="aa-side-icon">{Icon.signout()}</span>
            Sign out
          </Link>
        </div>
      </aside>

      <main className="aa-main">{children}</main>
    </div>
  );
}
