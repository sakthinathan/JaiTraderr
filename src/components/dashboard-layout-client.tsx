"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  Sliders, 
  FileText, 
  CreditCard, 
  Package, 
  TrendingDown, 
  BarChart3, 
  Menu, 
  X, 
  LogOut, 
  User, 
  ChevronRight,
  Shield,
  CircleDot,
  Settings,
  ChevronDown
} from "lucide-react";
import { UserProfile } from "@/lib/supabase/get-user";
import { Button } from "@/components/ui/button";
import ProfileSettingsModal from "@/components/profile-settings-modal";

interface DashboardLayoutClientProps {
  user: UserProfile;
  children: React.ReactNode;
}

export default function DashboardLayoutClient({ user, children }: DashboardLayoutClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileModalTab, setProfileModalTab] = useState<"profile" | "settings">("profile");

  const handleLogout = async () => {
    // Clear mock token cookie and localStorage
    document.cookie = "sb-mock-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    localStorage.removeItem("sb-mock-token");
    
    // Clear Supabase session if needed
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Ignore
    }

    router.push("/login");
    router.refresh();
  };

  const navItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      roles: ["admin", "billing_staff", "processing_staff", "delivery_staff"],
    },
    {
      name: "Customers",
      href: "/dashboard/customers",
      icon: Users,
      roles: ["admin", "billing_staff"],
    },
    {
      name: "Services & Rates",
      href: "/dashboard/rates",
      icon: Sliders,
      roles: ["admin", "billing_staff"],
    },
    {
      name: "Job Cards",
      href: "/dashboard/job-cards",
      icon: FileText,
      roles: ["admin", "billing_staff"],
    },
    {
      name: "Workflow Status",
      href: "/dashboard/workflow",
      icon: Package,
      roles: ["admin", "processing_staff", "billing_staff"],
    },
    {
      name: "Payments",
      href: "/dashboard/payments",
      icon: CreditCard,
      roles: ["admin", "billing_staff", "delivery_staff"],
    },
    {
      name: "Expenses",
      href: "/dashboard/expenses",
      icon: TrendingDown,
      roles: ["admin"],
    },
    {
      name: "Reports",
      href: "/dashboard/reports",
      icon: BarChart3,
      roles: ["admin"],
    },
  ];

  // Filter navigation items by role
  const filteredNavItems = navItems.filter((item) =>
    item.roles.includes(user.role)
  );

  return (
    <div className="h-screen overflow-hidden flex bg-slate-950 text-slate-100 font-sans">
      {/* Sidebar for Desktop & Tablet */}
      <aside 
        className={`hidden md:flex flex-col border-r border-slate-900 bg-slate-950/80 backdrop-blur-xl transition-all duration-300 z-30 shrink-0 ${
          sidebarCollapsed ? "w-16" : "w-64"
        }`}
      >
        {/* Brand Logo Header */}
        <div className="h-16 flex items-center justify-between px-3 border-b border-slate-900">
          <Link href="/dashboard" className="flex items-center overflow-hidden">
            {sidebarCollapsed ? (
              /* Collapsed: small teal J icon */
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/30 shrink-0">
                <span className="text-white font-black text-lg leading-none">J</span>
              </div>
            ) : (
              /* Expanded: logo image */
              <div className="flex items-center gap-2 overflow-hidden">
                <img
                  src="/jailaundry-logo.jpg"
                  alt="JaiLaundry Erode"
                  className="h-10 w-auto object-contain rounded-md"
                  style={{ maxWidth: '170px' }}
                />
              </div>
            )}
          </Link>
          <button 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="text-slate-500 hover:text-slate-200 transition-colors hidden lg:block shrink-0 ml-1"
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronRight className={`w-4 h-4 transform transition-transform duration-300 ${sidebarCollapsed ? "" : "rotate-180"}`} />
          </button>
        </div>

        {/* Sidebar Nav Links */}
        <nav className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative ${
                  isActive 
                    ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/10 shadow-lg shadow-indigo-500/5 font-semibold" 
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/50 border border-transparent"
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? "text-indigo-400" : "text-slate-400 group-hover:text-slate-100 group-hover:scale-105 transition-all"}`} />
                {!sidebarCollapsed && <span className="truncate">{item.name}</span>}
                
                {/* Active Indicator bar */}
                {isActive && (
                  <div className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-indigo-500" />
                )}
                {/* Tooltip on Collapsed */}
                {sidebarCollapsed && (
                  <div className="absolute left-16 scale-0 group-hover:scale-100 transition-all duration-200 bg-slate-900 border border-slate-800 text-slate-100 text-xs px-2 py-1 rounded shadow-md whitespace-nowrap z-50">
                    {item.name}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Profile Card & Logout */}
        <div className="p-3 border-t border-slate-900 bg-slate-950/40">
          <button
            onClick={() => {
              setProfileModalTab("profile");
              setProfileModalOpen(true);
            }}
            className="w-full flex items-center gap-3 p-2 rounded-lg bg-slate-900/40 border border-slate-900 hover:border-slate-800 hover:bg-slate-900/80 transition-all text-left cursor-pointer group"
            title="View Profile & Settings"
          >
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 group-hover:border-indigo-500/50 group-hover:bg-indigo-600/10 transition-colors">
              <User className="w-4 h-4 text-slate-400 group-hover:text-indigo-400 transition-colors" />
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate group-hover:text-white transition-colors">{user.name}</p>
                <p className="text-[10px] text-slate-500 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-indigo-400 shrink-0" />
                  <span className="truncate">{user.roleName}</span>
                </p>
              </div>
            )}
          </button>
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full mt-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 justify-start h-9 gap-3 px-3"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {!sidebarCollapsed && <span className="text-xs font-medium">Log out</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Header (Floating on top) */}
        <header className="h-16 flex items-center justify-between px-4 md:px-6 border-b border-slate-900 bg-slate-950/60 backdrop-blur-xl sticky top-0 z-20">
          <div className="flex items-center gap-3">
            {/* Hamburger menu for Mobile */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 -ml-2 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-slate-100 transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden md:flex items-center gap-2 text-xs font-medium px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-400">
              <CircleDot className="w-3.5 h-3.5 text-emerald-400 shrink-0 animate-pulse" />
              <span>Branch: </span>
              <span className="text-slate-200 font-semibold">{user.branchName}</span>
            </div>
            <img src="/jailaundry-logo.jpg" alt="JaiLaundry" className="md:hidden h-8 w-auto object-contain rounded" />
          </div>

          <div className="flex items-center gap-2.5">
            {/* Quick Settings Icon Button */}
            <button
              onClick={() => {
                setProfileModalTab("settings");
                setProfileModalOpen(true);
              }}
              className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-850 hover:border-slate-700 transition-all cursor-pointer flex items-center justify-center shadow-sm"
              title="Settings & Role Switcher"
              aria-label="Settings"
            >
              <Settings className="w-4 h-4 hover:rotate-45 transition-transform duration-300" />
            </button>

            {/* Display logged in status on mobile header */}
            <button
              onClick={() => {
                setProfileModalTab("profile");
                setProfileModalOpen(true);
              }}
              className="md:hidden flex items-center gap-2 text-right p-1 rounded-lg hover:bg-slate-900 transition-colors cursor-pointer text-left"
              title="View Profile Details"
            >
              <div>
                <p className="text-xs font-semibold text-slate-200">{user.name}</p>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                  {user.roleName}
                </span>
              </div>
              <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center font-bold text-xs text-indigo-400">
                {user.name.slice(0, 2).toUpperCase()}
              </div>
            </button>

            {/* Desktop Profile Pill Trigger */}
            <button
              onClick={() => {
                setProfileModalTab("profile");
                setProfileModalOpen(true);
              }}
              className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 transition-all cursor-pointer group text-left shadow-sm"
              title="View Profile & Settings"
            >
              <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center font-bold text-xs text-indigo-400 group-hover:scale-105 transition-transform">
                {user.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="hidden lg:block text-left pr-1">
                <p className="text-xs font-semibold text-slate-200 leading-tight group-hover:text-white transition-colors">{user.name}</p>
                <p className="text-[10px] text-slate-500 leading-none mt-0.5">{user.roleName}</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-colors" />
            </button>
          </div>
        </header>

        {/* Dashboard Pages Mount */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6 relative">
          {children}
        </main>

        {/* Mobile Floating Bottom Bar */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-950/80 backdrop-blur-xl border-t border-slate-900 px-4 py-2 flex justify-around items-center z-20 shadow-lg shadow-black/85">
          {filteredNavItems.slice(0, 4).map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${
                  isActive ? "text-indigo-400 font-semibold" : "text-slate-500 hover:text-slate-300"
                }`}
              >
                <Icon className="w-5.5 h-5.5" />
                <span className="text-[10px]">{item.name}</span>
              </Link>
            );
          })}
          <button
            onClick={handleLogout}
            className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-slate-500 hover:text-rose-400"
          >
            <LogOut className="w-5.5 h-5.5" />
            <span className="text-[10px]">Log out</span>
          </button>
        </div>
      </div>

      {/* Drawer Overlay for Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop click close */}
          <div 
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
          />
          
          {/* Drawer Menu */}
          <div className="relative w-72 max-w-[80vw] bg-slate-950 border-r border-slate-900 p-5 flex flex-col z-10 animate-slide-in-left">
            <div className="flex items-center justify-between mb-8">
              <img src="/jailaundry-logo.jpg" alt="JaiLaundry Erode" className="h-10 w-auto object-contain rounded-md" />
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-2">
              {filteredNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3.5 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive 
                        ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/10 font-semibold" 
                        : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/50"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="pt-4 border-t border-slate-900 mt-auto">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setProfileModalTab("profile");
                  setProfileModalOpen(true);
                }}
                className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-slate-900/40 border border-slate-900 hover:border-slate-800 hover:bg-slate-900 text-left transition-colors cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center shrink-0 group-hover:bg-indigo-600/20 group-hover:text-indigo-400 transition-colors">
                  <User className="w-4 h-4 text-slate-400 group-hover:text-indigo-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-200 group-hover:text-white">{user.name}</p>
                  <p className="text-[10px] text-slate-500">{user.roleName}</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Profile & Settings Modal */}
      <ProfileSettingsModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        user={user}
        initialTab={profileModalTab}
        onLogout={handleLogout}
      />
    </div>
  );
}
