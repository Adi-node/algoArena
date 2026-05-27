import Link from "next/link";
import { Brand, Icon } from "../_ui/icons";
import SideLink from "./SideLink";
import type { ReactNode } from "react";

const navItems = [
  { href: "/dashboard",            label: "Overview",        icon: Icon.grid,     exact: true },
  { href: "/dashboard/sync",       label: "LeetCode Sync",   icon: Icon.trend },
  { href: "/dashboard/contest",    label: "Custom Contest",  icon: Icon.clock },
  { href: "/dashboard/upsolving",  label: "Upsolving Queue", icon: Icon.shield },
  { href: "/dashboard/analysis",   label: "AI Analysis",     icon: Icon.spark },
  { href: "/dashboard/practice",   label: "Practice",        icon: Icon.terminal },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="aa-dash">
      <aside className="aa-side">
        <Link href="/" className="aa-side-brand"><Brand /></Link>
        <div className="aa-side-nav">
          {navItems.map((item) => (
            <SideLink
              key={item.href}
              href={item.href}
              icon={item.icon()}
              label={item.label}
              exact={item.exact}
            />
          ))}
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
