"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { loadDiagramManifest, type DiagramManifest } from "./diagram-manifest";
import { assetUrl } from "./asset-path";

/** A configurable implementation scope (e.g., "D365 CE", "F&O", "All") */
export interface ScopeConfig {
  id: string;
  label: string;
  default?: boolean;
  filter?: { field: string; patterns: string[] };
}

interface NavEntry {
  tabId: string;
  itemId: string | null;
}

interface DashboardContextValue {
  loading: boolean;
  editMode: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  navigateToTab: (tabId: string, itemId?: string) => void;
  navigateBack: () => void;
  canGoBack: boolean;
  selectedItemId: string | null;
  setSelectedItemId: (id: string | null) => void;
  switchTab: (tabId: string) => void;
  pendingBpcCode: string | null;
  navigateToBpc: (bpcCode: string) => void;
  viewScope: string;
  setViewScope: (scope: string) => void;
  activeScopeConfig: ScopeConfig | null;
  branding: { appName: string; appTitle: string; logoPath: string; poweredBy: boolean; scopes: ScopeConfig[] };
  diagramManifest: DiagramManifest;
}

const DEFAULT_BRANDING = { appName: "Implementation", appTitle: "Dashboard", logoPath: "", poweredBy: false, scopes: [] as ScopeConfig[] };

const DashboardContext = createContext<DashboardContextValue>({
  loading: true,
  editMode: true,
  activeTab: "processcatalog",
  setActiveTab: () => {},
  navigateToTab: () => {},
  navigateBack: () => {},
  canGoBack: false,
  selectedItemId: null,
  setSelectedItemId: () => {},
  switchTab: () => {},
  pendingBpcCode: null,
  navigateToBpc: () => {},
  viewScope: "primary",
  setViewScope: () => {},
  activeScopeConfig: null,
  branding: DEFAULT_BRANDING,
  diagramManifest: {},
});

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("processcatalog");
  const [viewScope, setViewScope] = useState("primary");
  const [diagramManifest, setDiagramManifest] = useState<DiagramManifest>({});
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [branding, setBranding] = useState(DEFAULT_BRANDING);
  const [pendingBpcCode, setPendingBpcCode] = useState<string | null>(null);
  const navStackRef = useRef<NavEntry[]>([]);
  const [canGoBack, setCanGoBack] = useState(false);

  const navigateToTab = useCallback((tabId: string, itemId?: string) => {
    navStackRef.current.push({ tabId: activeTab, itemId: selectedItemId });
    if (navStackRef.current.length > 50) navStackRef.current.shift();
    setCanGoBack(true);
    setSelectedItemId(itemId || null);
    setPendingBpcCode(null);
    setActiveTab(tabId);
  }, [activeTab, selectedItemId]);

  const navigateBack = useCallback(() => {
    const entry = navStackRef.current.pop();
    if (entry) {
      setCanGoBack(navStackRef.current.length > 0);
      setSelectedItemId(entry.itemId);
      setPendingBpcCode(null);
      setActiveTab(entry.tabId);
    }
  }, []);

  const switchTab = useCallback((tabId: string) => {
    setSelectedItemId(null);
    setPendingBpcCode(null);
    setActiveTab(tabId);
  }, []);

  const navigateToBpc = useCallback((bpcCode: string) => {
    navStackRef.current.push({ tabId: activeTab, itemId: selectedItemId });
    if (navStackRef.current.length > 50) navStackRef.current.shift();
    setCanGoBack(true);
    setPendingBpcCode(bpcCode);
    setSelectedItemId(null);
    setActiveTab("processcatalog");
  }, [activeTab, selectedItemId]);

  useEffect(() => {
    async function init() {
      const [diagrams, brandingData] = await Promise.all([
        loadDiagramManifest(),
        fetch(assetUrl("/data/branding.json")).then(r => r.ok ? r.json() : DEFAULT_BRANDING).catch(() => DEFAULT_BRANDING),
      ]);
      setDiagramManifest(diagrams);
      const rawScopes = brandingData.scopes;
      const scopes: ScopeConfig[] = Array.isArray(rawScopes) ? rawScopes : rawScopes ? [rawScopes] : [];
      const mergedBranding = { ...DEFAULT_BRANDING, ...brandingData, scopes };
      setBranding(mergedBranding);
      if (mergedBranding.scopes.length > 0) {
        const defaultScope = mergedBranding.scopes.find((s: ScopeConfig) => s.default) || mergedBranding.scopes[0];
        setViewScope(defaultScope.id);
      }
      if (brandingData.colors) {
        const root = document.documentElement;
        if (brandingData.colors.primary) root.style.setProperty('--brand-primary', brandingData.colors.primary);
        if (brandingData.colors.accent) root.style.setProperty('--brand-accent', brandingData.colors.accent);
        if (brandingData.colors.secondary) root.style.setProperty('--brand-secondary', brandingData.colors.secondary);
      }
      setLoading(false);
    }
    init();
  }, []);

  const activeScopeConfig = branding.scopes.find(s => s.id === viewScope) || null;

  return (
    <DashboardContext.Provider
      value={{ loading, editMode: true, activeTab, setActiveTab, navigateToTab, navigateBack, canGoBack, selectedItemId, setSelectedItemId, switchTab, pendingBpcCode, navigateToBpc, branding, viewScope, setViewScope, activeScopeConfig, diagramManifest }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  return useContext(DashboardContext);
}
