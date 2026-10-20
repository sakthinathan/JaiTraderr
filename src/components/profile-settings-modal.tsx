"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  User, 
  Settings, 
  Shield, 
  Building, 
  Mail, 
  LogOut, 
  Check, 
  Key, 
  CheckCircle2, 
  RefreshCw, 
  Smartphone
} from "lucide-react";
import { UserProfile } from "@/lib/supabase/get-user";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  initialTab?: "profile" | "settings";
  onLogout: () => void;
}

export default function ProfileSettingsModal({
  isOpen,
  onClose,
  user,
  initialTab = "profile",
  onLogout,
}: ProfileSettingsModalProps) {
  const router = useRouter();
  const [tabOverride, setTabOverride] = useState<"profile" | "settings" | null>(null);
  const activeTab = tabOverride ?? initialTab;
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);
  const [whatsappDirect, setWhatsappDirect] = useState(true);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const handleClose = () => {
    setTabOverride(null);
    onClose();
  };

  const handleRoleSwitch = (mockRole: "admin" | "billing" | "processing" | "delivery") => {
    setIsSwitchingRole(true);
    // Set cookie
    document.cookie = `sb-mock-token=${mockRole}; path=/; max-age=86400; SameSite=Lax`;
    setSavedNotice(`Switched role to ${mockRole.toUpperCase()}! Refreshing dashboard...`);
    setTimeout(() => {
      onClose();
      router.push("/dashboard");
      router.refresh();
      window.location.reload();
    }, 400);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return { label: "System Administrator", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
      case "billing_staff":
        return { label: "Billing Officer", color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" };
      case "processing_staff":
        return { label: "Operations Staff", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" };
      case "delivery_staff":
        return { label: "Delivery Officer", color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" };
      default:
        return { label: role, color: "bg-slate-500/10 text-slate-400 border-slate-500/20" };
    }
  };

  const roleInfo = getRoleBadge(user.role);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="border-slate-800 bg-slate-950 text-slate-100 sm:max-w-2xl lg:max-w-3xl w-full p-0 overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
        <DialogTitle className="sr-only">User Profile and System Settings</DialogTitle>
        {/* Top Header Banner */}
        <div className="relative p-6 bg-gradient-to-br from-indigo-950/80 via-slate-900 to-slate-950 border-b border-slate-850">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-emerald-500 p-0.5 shadow-lg shadow-indigo-500/20">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center font-bold text-lg text-white">
                  {user.name.slice(0, 2).toUpperCase()}
                </div>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">{user.name}</h2>
                <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <Mail className="w-3.5 h-3.5 text-slate-500" />
                  <span>{user.email}</span>
                </p>
              </div>
            </div>
            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${roleInfo.color}`}>
              {roleInfo.label}
            </span>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 mt-5 pt-3 border-t border-slate-800/60">
            <button
              onClick={() => setTabOverride("profile")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "profile"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Profile Details
            </button>
            <button
              onClick={() => setTabOverride("settings")}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "settings"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              Settings & Roles
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
          {savedNotice && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{savedNotice}</span>
            </div>
          )}

          {activeTab === "profile" ? (
            <div className="space-y-4">
              {/* Account Information Card */}
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-850 space-y-3">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-indigo-400" />
                  Operational Credentials
                </h3>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Assigned Branch</span>
                    <span className="text-slate-200 font-medium flex items-center gap-1.5 mt-0.5">
                      <Building className="w-3.5 h-3.5 text-emerald-400" />
                      {user.branchName}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px]">System Role</span>
                    <span className="text-slate-200 font-medium flex items-center gap-1.5 mt-0.5">
                      <Key className="w-3.5 h-3.5 text-amber-400" />
                      {user.roleName}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px]">Account ID</span>
                    <span className="text-slate-300 font-mono text-[10px] mt-0.5 block truncate">
                      {user.id}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px]">Security Status</span>
                    <span className="text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                      <Check className="w-3.5 h-3.5" />
                      Active & Verified
                    </span>
                  </div>
                </div>
              </div>

              {/* Permissions Summary Card */}
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-850 space-y-2.5">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Role Capabilities
                </h3>
                <ul className="text-xs space-y-2 text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Create & manage active customer job cards</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Record advance and final payments via UPI/Cash</span>
                  </li>
                  {user.role === "admin" && (
                    <>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span>Admin Passcode unlock & catalog pricing management</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span>Branch expense tracking & financial ledger reports</span>
                      </li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Quick Role Switcher for Demo / Testing */}
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-850 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                    Switch Operational Role
                  </h3>
                  <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20">
                    Fast Preview
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Switch roles instantly to preview different permissions and interface capabilities.
                </p>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button
                    variant={user.role === "admin" ? "default" : "outline"}
                    size="sm"
                    disabled={isSwitchingRole}
                    onClick={() => handleRoleSwitch("admin")}
                    className={`justify-start text-xs h-9 ${user.role === "admin" ? "bg-indigo-600 text-white" : "border-slate-800 text-slate-300 hover:bg-slate-900"}`}
                  >
                    👑 Alex (Admin)
                  </Button>
                  <Button
                    variant={user.role === "billing_staff" ? "default" : "outline"}
                    size="sm"
                    disabled={isSwitchingRole}
                    onClick={() => handleRoleSwitch("billing")}
                    className={`justify-start text-xs h-9 ${user.role === "billing_staff" ? "bg-indigo-600 text-white" : "border-slate-800 text-slate-300 hover:bg-slate-900"}`}
                  >
                    🧾 Brad (Billing)
                  </Button>
                  <Button
                    variant={user.role === "processing_staff" ? "default" : "outline"}
                    size="sm"
                    disabled={isSwitchingRole}
                    onClick={() => handleRoleSwitch("processing")}
                    className={`justify-start text-xs h-9 ${user.role === "processing_staff" ? "bg-indigo-600 text-white" : "border-slate-800 text-slate-300 hover:bg-slate-900"}`}
                  >
                    🧺 Pat (Processing)
                  </Button>
                  <Button
                    variant={user.role === "delivery_staff" ? "default" : "outline"}
                    size="sm"
                    disabled={isSwitchingRole}
                    onClick={() => handleRoleSwitch("delivery")}
                    className={`justify-start text-xs h-9 ${user.role === "delivery_staff" ? "bg-indigo-600 text-white" : "border-slate-800 text-slate-300 hover:bg-slate-900"}`}
                  >
                    🚚 David (Delivery)
                  </Button>
                </div>
              </div>

              {/* Preferences */}
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-850 space-y-3">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                  Workflow Preferences
                </h3>

                <div className="flex items-center justify-between py-1 text-xs">
                  <div>
                    <span className="text-slate-200 font-medium block">WhatsApp Receipts & Updates</span>
                    <span className="text-slate-500 text-[11px]">Generate direct WhatsApp chat links for invoices</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={whatsappDirect}
                    onChange={(e) => setWhatsappDirect(e.target.checked)}
                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer with Logout Button */}
        <div className="p-4 border-t border-slate-850 bg-slate-950/80 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-slate-200"
          >
            Close
          </Button>

          <Button
            onClick={() => {
              onClose();
              onLogout();
            }}
            variant="destructive"
            size="sm"
            className="text-xs gap-2 bg-rose-600/20 border border-rose-500/30 text-rose-300 hover:bg-rose-600 hover:text-white transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
