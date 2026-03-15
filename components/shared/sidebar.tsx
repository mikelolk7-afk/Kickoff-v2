"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  Users,
  Crosshair,
  Trophy,
  ArrowRightLeft,
  Search,
  Dumbbell,
  Building,
  Wallet,
  ShoppingBag,
  LogOut,
  Award,
  Globe,
  User,
  Bell,
  MessageSquare,
  Sun,
  Moon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/squad", label: "Squad", icon: Users },
  { href: "/tactics", label: "Tactics", icon: Crosshair },
  { href: "/league", label: "League", icon: Trophy },
  { href: "/transfers", label: "Transfers", icon: ArrowRightLeft },
  { href: "/scouting", label: "Scouting", icon: Search },
  { href: "/training", label: "Training", icon: Dumbbell },
  { href: "/stadium", label: "Stadium", icon: Building },
  { href: "/finances", label: "Finances", icon: Wallet },
  { href: "/store", label: "Store", icon: ShoppingBag },
  { href: "/cup", label: "Cup", icon: Award },
  { href: "/continental", label: "Continental", icon: Globe },
  { href: "/manager", label: "Profile", icon: User },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/chat", label: "Chat", icon: MessageSquare },
];

const MOBILE_NAV = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/squad", label: "Squad", icon: Users },
  { href: "/tactics", label: "Tactics", icon: Crosshair },
  { href: "/transfers", label: "Market", icon: ArrowRightLeft },
  { href: "/league", label: "League", icon: Trophy },
];

export function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-panel border-r border-border h-screen fixed left-0 top-0">
        <div className="p-4 border-b border-border">
          <h1 className="text-xl font-bold text-primary">Kickoff Manager</h1>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "text-muted hover:text-foreground hover:bg-surface"
                )}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border space-y-1">
          {/* Theme toggle */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted hover:text-foreground hover:bg-surface w-full transition-colors"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </button>

          {/* Sign out */}
          <button
            onClick={async () => {
              const res = await fetch("/api/auth/csrf");
              const { csrfToken } = await res.json();
              await fetch("/api/auth/signout", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: `csrfToken=${csrfToken}`,
              });
              window.location.href = "/login";
            }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted hover:text-red-400 hover:bg-surface w-full transition-colors"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-panel border-t border-border z-50">
        <div className="flex justify-around py-2">
          {MOBILE_NAV.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-1 text-xs font-medium transition-colors",
                  isActive ? "text-primary" : "text-subtle"
                )}
              >
                <item.icon size={20} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
