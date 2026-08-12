"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Beer,
  Trophy,
  Medal,
  User,
  LogOut,
  Map,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", mobileLabel: "Home", icon: LayoutDashboard },
  { href: "/log-beer", label: "Log Beer", mobileLabel: "Log", icon: Beer },
  { href: "/leaderboard", label: "Leaderboard", mobileLabel: "Board", icon: Trophy },
  { href: "/map", label: "Beer Map", mobileLabel: "Map", icon: Map },
  { href: "/achievements", label: "Achievements", mobileLabel: "Badges", icon: Medal },
  { href: "/profile", label: "Profile", mobileLabel: "Me", icon: User },
];

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <>
      {/* Top bar */}
      <header className="bg-amber-900/80 backdrop-blur border-b border-amber-800 px-4 py-3 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-2xl">🍺</span>
          <span className="font-bold text-amber-100 text-lg tracking-tight">
            Hop Tracker
          </span>
        </Link>
        <button
          onClick={signOut}
          className="flex items-center gap-1 text-amber-400 hover:text-amber-200 text-sm"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </header>

      {/* Bottom tab bar for mobile */}
      <nav className="fixed bottom-0 left-0 right-0 bg-amber-900/95 backdrop-blur border-t border-amber-800 z-50 flex md:hidden">
        {navItems.map(({ href, label, mobileLabel, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "min-w-0 flex-1 flex flex-col items-center py-2 text-[10px] gap-1 transition-colors",
              pathname === href
                ? "text-amber-300"
                : "text-amber-500 hover:text-amber-300"
            )}
          >
            <Icon size={20} />
            <span className="truncate max-w-full px-1">{mobileLabel}</span>
          </Link>
        ))}
      </nav>

      {/* Sidebar for desktop */}
      <aside className="hidden md:flex flex-col w-56 bg-amber-900/60 border-r border-amber-800 min-h-screen fixed left-0 top-[57px] pt-6 pb-4 px-3">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm font-medium transition-colors",
              pathname === href
                ? "bg-amber-700 text-amber-100"
                : "text-amber-400 hover:bg-amber-800/60 hover:text-amber-200"
            )}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </aside>
    </>
  );
}
