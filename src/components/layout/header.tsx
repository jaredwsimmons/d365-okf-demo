"use client";

/* eslint-disable @next/next/no-img-element */

import { Search } from "lucide-react";
import { useDashboard } from "@/lib/dashboard-context";

export function DashboardHeader() {
  const { viewScope, setViewScope, branding } = useDashboard();

  const scopes = branding.scopes;

  return (
    <header className="bg-brand-accent text-white px-8 py-2.5 flex justify-between items-center flex-wrap gap-2 shrink-0">
      <div className="flex items-center gap-4">
        {branding.logoPath && (
          <img
            src={branding.logoPath}
            alt={branding.appName || "Dashboard"}
            className="h-8"
          />
        )}
        <h1 className="text-base font-bold tracking-wide">
          {branding.appTitle || "CoE Dashboard"}
        </h1>
      </div>
      <div className="flex items-center gap-3">
        {/* View scope toggle — only show if multiple scopes configured */}
        {scopes.length > 1 && (
          <div className="flex rounded-md overflow-hidden border border-white/30">
            {scopes.map((scope) => (
              <button
                key={scope.id}
                className={`px-3 py-1 text-xs font-medium transition-colors ${
                  viewScope === scope.id
                    ? "bg-white text-brand-accent"
                    : "bg-transparent text-white/80 hover:bg-white/10"
                }`}
                onClick={() => setViewScope(scope.id)}
              >
                {scope.label}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => window.dispatchEvent(new Event("open-command-palette"))}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md border border-white/20 text-white/60 hover:text-white/90 hover:border-white/40 transition-colors"
        >
          <Search className="h-3.5 w-3.5" />
          <span>Search</span>
          <kbd className="ml-1 text-[10px] bg-white/10 rounded px-1 py-0.5">Ctrl+K</kbd>
        </button>
        <img
          src="/icons/Dynamics365.svg"
          alt="Dynamics 365"
          className="h-5 opacity-70"
        />
      </div>
    </header>
  );
}
