import React from "react";
import { Link, useLocation } from "wouter";
import { Dumbbell, Utensils, LayoutDashboard, Search, UserCircle, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/dashboard", label: "Home", icon: LayoutDashboard },
    { href: "/workouts", label: "Workout", icon: Dumbbell },
    { href: "/nutrition", label: "Nutrition", icon: Utensils },
    { href: "/feed", label: "Feed", icon: Activity },
    { href: "/profile", label: "Profile", icon: UserCircle },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row dark">
      {/* Mobile Top Bar (Optional, can be hidden on desktop) */}
      <header className="md:hidden sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold italic tracking-tight text-primary">FITTRACK</h1>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card/50 h-screen sticky top-0 p-4">
        <div className="mb-8 px-4">
          <h1 className="text-2xl font-black italic tracking-tighter text-primary">FITTRACK</h1>
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
        <div className="max-w-4xl mx-auto w-full h-full p-4 md:p-8">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-xl border-t border-border pb-safe">
        <div className="flex items-center justify-around p-2">
          {navItems.map((item) => {
            const isActive =
              location === item.href ||
              (item.href !== "/" &&
                (location.startsWith(item.href) ||
                  (item.href === "/workouts" && location === "/workout")));
            return (
              <Link key={item.href} href={item.href} className="flex-1">
                <div className="flex flex-col items-center justify-center py-2 gap-1 relative">
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
