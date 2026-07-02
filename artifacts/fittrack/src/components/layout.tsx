import React from "react";
import { Link, useLocation } from "wouter";
import { Dumbbell, Utensils, LayoutDashboard, Search, UserCircle, Activity, Bell, CalendarDays, BarChart2, Target, Plus, Droplets, Pill } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLiveUnreadCount } from "@/hooks/use-live-notifications";
import { ThemeToggle } from "@/components/theme-toggle";
import { useGetMe } from "@workspace/api-client-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function NotificationBell() {
  const { data } = useLiveUnreadCount();
  const count = data?.count ?? 0;
  return (
    <Link href="/notifications" aria-label="Notifications">
      <div className="relative p-2 rounded-full text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors">
        <Bell className="w-5 h-5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-primary text-primary-foreground shadow-[0_0_8px] shadow-primary/60">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </div>
    </Link>
  );
}

function ProfileAvatarShortcut() {
  const { data: me } = useGetMe();
  if (!me) return null;
  return (
    <Link href="/profile" aria-label="Go to Profile" className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full">
      <Avatar className="w-8 h-8 md:w-9 md:h-9 hover:scale-105 hover:shadow-md hover:shadow-primary/20 transition-all cursor-pointer">
        <AvatarImage src={me.avatarUrl ?? undefined} />
        <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
          {(me.username ?? "U")[0].toUpperCase()}
        </AvatarFallback>
      </Avatar>
    </Link>
  );
}

import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerClose } from "@/components/ui/drawer";

function QuickActionSheet() {
  const actions = [
    { href: "/workout", label: "Start Workout", icon: Dumbbell, color: "text-primary", bg: "bg-primary/10" },
    { href: "/nutrition/log", label: "Log Food", icon: Utensils, color: "text-green-500", bg: "bg-green-500/10" },
    { href: "/nutrition/log?type=water", label: "Log Water", icon: Droplets, color: "text-blue-500", bg: "bg-blue-500/10" },
    { href: "/nutrition/log?type=supplements", label: "Supplements", icon: Pill, color: "text-purple-500", bg: "bg-purple-500/10" },
    { href: "/calendar", label: "Calendar", icon: CalendarDays, color: "text-orange-500", bg: "bg-orange-500/10" },
    { href: "/stats", label: "Stats", icon: BarChart2, color: "text-indigo-500", bg: "bg-indigo-500/10" },
    { href: "/goals", label: "Goals", icon: Target, color: "text-rose-500", bg: "bg-rose-500/10" },
  ];

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <div className="flex flex-col items-center justify-center relative cursor-pointer -mt-6">
          <div className="w-14 h-14 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg shadow-primary/40 hover:scale-105 active:scale-95 transition-all border-4 border-background">
            <Plus className="w-7 h-7" />
          </div>
        </div>
      </DrawerTrigger>
      <DrawerContent>
        <div className="max-w-md w-full mx-auto pb-8">
          <DrawerHeader>
            <DrawerTitle className="text-center">Quick Actions</DrawerTitle>
          </DrawerHeader>
          <div className="grid grid-cols-4 gap-4 px-4 mt-4">
            {actions.map((action) => (
              <DrawerClose asChild key={action.label}>
                <Link href={action.href} className="flex flex-col items-center gap-2">
                  <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-transform active:scale-95", action.bg, action.color)}>
                    <action.icon className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-medium text-center leading-tight">
                    {action.label}
                  </span>
                </Link>
              </DrawerClose>
            ))}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/dashboard", label: "Home", icon: LayoutDashboard },
    { href: "/calendar", label: "Calendar", icon: CalendarDays },
    { href: "/workouts", label: "Workout", icon: Dumbbell },
    { href: "/nutrition", label: "Nutrition", icon: Utensils },
    { href: "/feed", label: "Feed", icon: Activity },
    { href: "/stats", label: "Stats", icon: BarChart2 },
    { href: "/goals", label: "Goals", icon: Target },
    { href: "/search", label: "Discover", icon: Search },
    { href: "/profile", label: "Profile", icon: UserCircle },
  ];

  const mobileNavItems = [
    { href: "/dashboard", label: "Home", icon: LayoutDashboard },
    { href: "/workouts", label: "Workout", icon: Dumbbell },
    { isFab: true },
    { href: "/feed", label: "Feed", icon: Activity },
    { href: "/profile", label: "Profile", icon: UserCircle },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* Mobile Top Bar */}
      <header className="md:hidden sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border p-4 flex items-center justify-between">
        <Link href="/dashboard" aria-label="Go to Home" className="hover:opacity-80 hover:scale-[0.98] transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
          <h1 className="text-xl font-bold italic tracking-tight text-primary">FITTRACK</h1>
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <NotificationBell />
          <Link href="/search" aria-label="Search for users">
            <div className="p-2 rounded-full text-muted-foreground hover:bg-white/5 hover:text-foreground">
              <Search className="w-5 h-5" />
            </div>
          </Link>
          <ProfileAvatarShortcut />
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card/50 h-screen sticky top-0 p-4">
        <div className="mb-8 px-4 flex items-center justify-between">
          <Link href="/dashboard" aria-label="Go to Home" className="hover:opacity-80 hover:scale-[0.98] transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
            <h1 className="text-2xl font-black italic tracking-tighter text-primary">FITTRACK</h1>
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <NotificationBell />
          </div>
        </div>
        <nav className="flex-1 space-y-2">
          {navItems.map((item) => {
            const isActive =
              location === item.href ||
              (item.href !== "/" &&
                (location.startsWith(item.href) ||
                  (item.href === "/workouts" && location === "/workout")));
            return (
              <Link key={item.href} href={item.href} className="block">
                <div
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                      : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 pb-20 md:pb-0 relative min-h-[100dvh]">
        <div className="hidden md:block absolute top-6 right-8 z-30">
          <ProfileAvatarShortcut />
        </div>
        <div className="max-w-4xl mx-auto w-full h-full p-4 md:p-8">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-xl border-t border-border pb-safe">
        <div className="flex items-end justify-around px-2 pb-2 pt-1 h-16">
          {mobileNavItems.map((item, i) => {
            if (item.isFab) {
              return (
                <div key="fab" className="flex-1 flex justify-center h-full items-end">
                  <QuickActionSheet />
                </div>
              );
            }
            
            const isActive =
              location === item.href ||
              (item.href !== "/" && item.href &&
                (location.startsWith(item.href) ||
                  (item.href === "/workouts" && location === "/workout")));
            return (
              <Link key={item.href} href={item.href!} className="flex-1 h-full">
                <div className="flex flex-col items-center justify-end h-full gap-1 relative pb-1">
                  {isActive && (
                    <div className="absolute top-0 w-8 h-1 bg-primary rounded-b-full shadow-[0_0_8px_rgba(255,90,0,0.8)]" />
                  )}
                  <item.icon
                    className={cn(
                      "w-6 h-6 transition-colors duration-200",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  <span
                    className={cn(
                      "text-[10px] font-semibold transition-colors duration-200",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {item.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
