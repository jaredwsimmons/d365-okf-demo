"use client";

import { useState, useMemo } from "react";
import { useEnvironmentDriftFull } from "@/hooks/use-inventory-api";
import { ExplorerSkeleton } from "@/components/shared/loading-states";
import { Badge } from "@/components/ui";
import { Input } from "@/components/ui";
import { StatsBar } from "@/components/shared/stats-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { AccordionSection } from "@/components/shared/accordion-section";
import {
  ShieldAlert, ShieldX, Server, Trash2,
  AlertTriangle, Search, DatabaseZap,
} from "lucide-react";

// ---- Types ----

interface DriftFinding {
  type: string;
  severity: "high" | "medium";
  solution: string;
  detail: string;
  environments: string[];
}

interface PlaybookAction {
  phase: number;
  action: string;
  solution: string;
  reason: string;
}

interface PresenceGap {
  solution: string;
  isCore: boolean;
  isManaged: boolean;
  presentIn: string[];
  absentFrom: string[];
  componentCount: Record<string, number>;
}

// ---- Helpers ----

const SEVERITY_CONFIG = {
  high:   { icon: ShieldX,     color: "text-red-600",    bg: "bg-red-100 dark:bg-red-900/30",     label: "High" },
  medium: { icon: ShieldAlert, color: "text-orange-500", bg: "bg-orange-100 dark:bg-orange-900/30", label: "Medium" },
};

const ENV_NAMES: Record<string, string> = {
  devint: "Dev Integration",
  ort: "ORT",
  uat: "UAT",
  prod: "Production",
};

function SeverityBadge({ severity }: { severity: "high" | "medium" }) {
  const cfg = SEVERITY_CONFIG[severity];
  const Icon = cfg.icon;
  return (
    <Badge variant="secondary" className={`${cfg.bg} ${cfg.color} gap-1 text-[10px]`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </Badge>
  );
}

// ---- Main Component ----

const ENV_ORDER = ["devint", "ort", "uat", "prod"];

export function EnvironmentHygieneTab() {
  const { data: apiDrift, isLoading: driftLoading } = useEnvironmentDriftFull();
  const [severityFilter, setSeverityFilter] = useState<string | null>(null);
  const [findingSearch, setFindingSearch] = useState("");

  const driftData = apiDrift;
  const driftAny = driftData as Record<string, unknown> | null;

  const envKeys: string[] = useMemo(() => {
    const meta = (driftAny?.metadata as Record<string, unknown>) || {};
    const raw: string[] = (meta.environmentsScanned as string[]) || (meta.environments as string[]) || [];
    return ENV_ORDER.filter(k => raw.includes(k));
  }, [driftAny]);
  const findings: DriftFinding[] = useMemo(() => (driftAny?.findings as DriftFinding[]) || [], [driftAny]);
  const playbook: Record<string, PlaybookAction[]> = useMemo(() => (driftAny?.playbook as Record<string, PlaybookAction[]>) || {}, [driftAny]);
  const presenceGaps: PresenceGap[] = useMemo(() => [] as PresenceGap[], []);
  const summary = useMemo(() => (driftAny?.summary as Record<string, unknown>) || {}, [driftAny]);

  const filteredFindings = useMemo(() => {
    let f = findings;
    if (severityFilter) f = f.filter(d => d.severity === severityFilter);
    if (findingSearch) {
      const q = findingSearch.toLowerCase();
      f = f.filter(d => d.solution.toLowerCase().includes(q) || d.detail.toLowerCase().includes(q) || d.type.toLowerCase().includes(q));
    }
    return f;
  }, [findings, severityFilter, findingSearch]);

  if (driftLoading) return <ExplorerSkeleton />;

  if (!driftData) {
    return (
      <EmptyState
        icon={<DatabaseZap className="w-10 h-10" />}
        title="No data available"
        subtitle="Run the extraction pipeline to populate environment data"
      />
    );
  }

  const highCount = findings.filter(f => f.severity === "high").length;
  const medCount = findings.filter(f => f.severity === "medium").length;
  const totalCleanup = Object.values(playbook).reduce((sum, actions) => sum + actions.length, 0);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-background">
      <StatsBar stats={[
        { value: String(envKeys.length), label: "Environments" },
        { value: String(summary.totalSolutions || 0), label: "Solutions" },
        { value: String(findings.length), label: "Findings" },
        { value: String(highCount), label: "High Severity", highlight: highCount > 0 },
        { value: String(totalCleanup), label: "Cleanup Actions" },
      ]} />

      <div className="flex-1 overflow-y-auto custom-scroll">
        <div className="p-4 space-y-2 max-w-7xl mx-auto">

          {/* Environment Overview Cards */}
          <section>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Environment Overview
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {envKeys.map(envKey => {
                const envPlaybook = playbook[envKey] || [];
                return (
                  <div key={envKey} className="border rounded-lg p-3 space-y-2">
                    <span className="text-sm font-medium">{ENV_NAMES[envKey] || envKey}</span>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <div className="flex justify-between">
                        <span>Cleanup actions</span>
                        <span className={envPlaybook.length > 0 ? "text-orange-500 font-medium" : ""}>
                          {envPlaybook.length}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Presence gaps</span>
                        <span>{presenceGaps.filter(g => g.absentFrom.includes(envKey)).length}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Solution Presence Gaps */}
          <AccordionSection
            title={`Solution Presence Gaps (${presenceGaps.length})`}
            lucideIcon={AlertTriangle}
          >
            <div className="overflow-auto max-h-[400px] custom-scroll">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-3 py-1.5 font-medium">Solution</th>
                    {envKeys.map(k => (
                      <th key={k} className="text-center px-3 py-1.5 font-medium">{ENV_NAMES[k] || k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {presenceGaps.slice(0, 100).map(gap => (
                    <tr key={gap.solution} className="border-b last:border-b-0 hover:bg-accent/30">
                      <td className="px-3 py-1 font-mono">{gap.solution}</td>
                      {envKeys.map(k => (
                        <td key={k} className="text-center px-3 py-1">
                          {gap.presentIn.includes(k) ? (
                            <span className="text-green-600">{gap.componentCount[k] || 0}</span>
                          ) : (
                            <span className="text-red-400">-</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AccordionSection>

          {/* Cleanup Playbook */}
          <AccordionSection
            title={`Cleanup Playbook (${totalCleanup} actions)`}
            lucideIcon={Trash2}
          >
            <div className="space-y-2">
              {envKeys.map(envKey => {
                const actions = playbook[envKey];
                if (!actions || actions.length === 0) return null;
                const phases = [1, 2, 3];
                return (
                  <AccordionSection
                    key={envKey}
                    title={`${ENV_NAMES[envKey] || envKey} (${actions.length} actions)`}
                    lucideIcon={Server}
                  >
                    {phases.map(phase => {
                      const phaseActions = actions.filter(a => a.phase === phase);
                      if (phaseActions.length === 0) return null;
                      const phaseLabel = phase === 1 ? "Safe Deletes" : phase === 2 ? "Work-Item Solutions" : "Review Required";
                      return (
                        <div key={phase} className="mb-2">
                          <div className="text-[11px] font-medium text-muted-foreground px-2 py-1">
                            Phase {phase}: {phaseLabel} ({phaseActions.length})
                          </div>
                          {phaseActions.map((a, i) => (
                            <div key={i} className="flex items-center gap-2 px-3 py-0.5 text-xs">
                              <Badge variant="secondary" className={`text-[9px] px-1 ${
                                a.action === "delete" ? "bg-red-100 text-red-700 dark:bg-red-900/30" : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30"
                              }`}>
                                {a.action}
                              </Badge>
                              <span className="font-mono">{a.solution}</span>
                              <span className="text-muted-foreground truncate">{a.reason}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </AccordionSection>
                );
              })}
            </div>
          </AccordionSection>

          {/* Drift Findings */}
          <AccordionSection
            title={`Drift Findings (${findings.length})`}
            lucideIcon={ShieldAlert}
          >
            <div className="flex items-center gap-2 mb-2 px-1">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search findings..."
                  value={findingSearch}
                  onChange={e => setFindingSearch(e.target.value)}
                  className="pl-8 h-7 text-xs"
                />
              </div>
              <button
                onClick={() => setSeverityFilter(severityFilter === "high" ? null : "high")}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors ${
                  severityFilter === "high" ? "bg-red-100 text-red-700 dark:bg-red-900/30" : "hover:bg-accent"
                }`}
              >
                <ShieldX className="w-3 h-3" />
                High ({highCount})
              </button>
              <button
                onClick={() => setSeverityFilter(severityFilter === "medium" ? null : "medium")}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors ${
                  severityFilter === "medium" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30" : "hover:bg-accent"
                }`}
              >
                <ShieldAlert className="w-3 h-3" />
                Medium ({medCount})
              </button>
            </div>
            <div className="overflow-auto max-h-[400px] custom-scroll">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-3 py-1.5 font-medium">Severity</th>
                    <th className="text-left px-3 py-1.5 font-medium">Type</th>
                    <th className="text-left px-3 py-1.5 font-medium">Solution</th>
                    <th className="text-left px-3 py-1.5 font-medium">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFindings.slice(0, 100).map((f, i) => (
                    <tr key={i} className="border-b last:border-b-0 hover:bg-accent/30">
                      <td className="px-3 py-1"><SeverityBadge severity={f.severity} /></td>
                      <td className="px-3 py-1 text-muted-foreground whitespace-nowrap">{f.type.replace(/_/g, " ")}</td>
                      <td className="px-3 py-1 font-mono">{f.solution}</td>
                      <td className="px-3 py-1 text-muted-foreground">{f.detail}</td>
                    </tr>
                  ))}
                  {filteredFindings.length === 0 && (
                    <tr><td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">No findings match</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </AccordionSection>

        </div>
      </div>
    </div>
  );
}
