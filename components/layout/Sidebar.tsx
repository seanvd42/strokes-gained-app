"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  ArrowLeftRight,
  BarChart3,
  Tag,
  Mail,
  Settings,
  TrendingUp,
  LogOut,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", icon: LayoutDashboard, label: "Overview" },
  { href: "/transactions", icon: ArrowLeftRight, label: "Transactions" },
  { href: "/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/categories", icon: Tag, label: "Categories" },
  { href: "/reports", icon: Mail, label: "Reports" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

interface SidebarProps {
  reviewCount?: number;
}

export function Sidebar({ reviewCount = 0 }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col w-56 min-h-screen bg-card border-r border-border p-4">
      <div className="flex items-center gap-2.5 mb-8 px-2">
        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
          <TrendingUp className="w-4 h-4 text-primary" />
        </div>
        <span className="font-semibold text-foreground text-sm">Finance</span>
      </div>

      <nav className="flex-1 space-y-0.5">
        {nav.map(({ href, icon: Icon, label }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors relative",
                active
                  ? "bg-primary/15 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{label}</span>
              {label === "Categories" && reviewCount > 0 && (
                <span className="ml-auto flex items-center gap-1 text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-full">
                  <AlertCircle className="w-3 h-3" />
                  {reviewCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors w-full"
      >
        <LogOut className="w-4 h-4" />
        Sign Out
      </button>
    </aside>
  );
}
