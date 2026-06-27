"use client";

import { useState, useMemo } from "react";
import { useDashboard } from "@/lib/dashboard-context";
import { useGovernance, useEnvironmentDriftFull } from "@/hooks/use-inventory-api";
import { ExplorerSkeleton } from "@/components/shared/loading-states";
import { Badge } from "@/components/ui";
import { ScrollArea } from "@/components/ui";
import { Input } from "@/components/ui";
import { StatsBar } from "@/components/shared/stats-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { AccordionSection } from "@/components/shared/accordion-section";
import {
  ShieldAlert, ShieldX, Info, AlertTriangle, DatabaseZap,
  ChevronRight, Search, Server,
} from "lucide-react";
import type { GovernanceFindingsData, GovernanceFinding } from "@/types/inventory";

// ---- Severity config ----

const SEVERITY_CONFIG: Record<string, { icon: typeof ShieldAlert; color: string; bg: string; label: string }> = {
  high:    { icon: ShieldX,      color: "text-red-600",    bg: "bg-red-100 dark:bg-red-900/30",      label: "High" },
  medium:  { icon: ShieldAlert,  color: "text-orange-500", bg: "bg-orange-100 dark:bg-orange-900/30", label: "Medium" },
  warning: { icon: AlertTriangle, color: "text-yellow-600", bg: "bg-yellow-100 dark:bg-yellow-900/30", label: "Warning" },
  info:    { icon: Info,          color: "text-blue-500",   bg: "bg-blue-100 dark:bg-blue-900/30",     label: "Info" },
};

const ENV_NAMES: Record<string, string> = {
  devint: "Dev Integration",
  ort: "ORT",
  uat: "UAT",
  prod: "Production",
};

// ---- Drift types ----

interface DriftFinding {
  type: string;
  severity: "high" | "medium";
  solution: string;
  detail: string;
}

interface PlaybookAction {
  phase: number;
  action: string;
  solution: string;
  reason: string;
}

interface PresenceGap {
  solution: string;
  presentIn: string[];
  absentFrom: string[];
  componentCount: Record<string, number>;
}

// ---- Score gauge ----

function ScoreGauge({ score }: { score: number }) {
  const color = score >= 80 ? "text-green-500" : score >= 60 ? "text-yellow-500" : score >= 40 ? "text-orange-500" : "text-red-500";
  const bg = score >= 80 ? "stroke-green-500" : score >= 60 ? "stroke-yellow-500" : score >= 40 ? "stroke-orange-500" : "stroke-red-500";
  const circumference = 2 * Math.PI * 40;
  const filled = (score / 100) * circumference;

  return (
    <div className="relative w-20 h-20">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
        <circle cx="50" cy="50" r="40" fill="none" strokeWidth="8" strokeLinecap="round"
          className={bg} strokeDasharray={circumference} strokeDashoffset={circumference - filled} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-xl font-bold ${color}`}>{score}</span>
        <span className="text-[8px] text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

// ---- Component tab mapping ----

const COMPONENT_TYPE_TO_TAB: Record<string, string> = {
  flow: "workflows",
  webresource: "webresources",
  entity: "entities",
  form: "forms",
  app: "apps",
};

// ---- Main Component ----

const ENV_ORDER = ["devint", "ort", "uat", "prod"];

export function GovernanceTab() {
  const { navigateToTab } = useDashboard();
  const { data: apiGov, isLoading: govLoading } = useGovernance();
  const { data: apiDrift, isLoading: driftLoading } = useEnvironmentDriftFull();
  const [govSeverityFilter, setGovSeverityFilter] = useState<string | null>(null);
  const [govSearch, setGovSearch] = useState("");
  const [driftSeverityFilter, setDriftSeverityFilter] = useState<string | null>(null);
  const [driftSearch, setDriftSearch] = useState("");

  // Governance data from API
  const govData = useMemo<GovernanceFindingsData | null>(() => {
    if (apiGov) {
      return { metadata: { auditDate: "", rulesVersion: "" }, summary: apiGov.summary, findings: apiGov.findings as unknown as GovernanceFinding[] };
    }
    return null;
  }, [apiGov]);

  const govFindings = useMemo(() => {
    if (!govData) return [];
    let list = govData.findings.filter((f) => f.count > 0 || f.status !== "placeholder");
    if (govSeverityFilter) list = list.filter((f) => f.severity === govSeverityFilter);
    if (govSearch.trim()) {
      const q = govSearch.toLowerCase();
      list = list.filter((f) => `${f.ruleId} ${f.name} ${f.message} ${f.category}`.toLowerCase().includes(q));
    }
    return list.sort((a, b) => {
      const order: Record<string, number> = { high: 0, medium: 1, warning: 2, info: 3 };
      return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
    });
  }, [govData, govSeverityFilter, govSearch]);

  // Environment drift data from API
  const driftData = apiDrift;
  const driftAny = driftData as Record<string, unknown> | null;

  const envKeys: string[] = useMemo(() => {
    const meta = (driftAny?.metadata as Record<string, unknown>) || {};
    const raw: string[] = (meta.environmentsScanned as string[]) || (meta.environments as string[]) || [];
    return ENV_ORDER.filter(k => raw.includes(k));
  }, [driftAny]);
  const driftFindings: DriftFinding[] = useMemo(() => (driftAny?.findings as DriftFinding[]) || [], [driftAny]);
  const playbook: Record<string, PlaybookAction[]> = useMemo(() => (driftAny?.playbook as Record<string, PlaybookAction[]>) || {}, [driftAny]);
  const presenceGaps: PresenceGap[] = useMemo(() => [] as PresenceGap[], []);

  const filteredDrift = useMemo(() => {
    let f = driftFindings;
    if (driftSeverityFilter) f = f.filter(d => d.severity === driftSeverityFilter);
    if (driftSearch) {
      const q = driftSearch.toLowerCase();
      f = f.filter(d => d.solution.toLowerCase().includes(q) || d.detail.toLowerCase().includes(q));
    }
    return f;
  }, [driftFindings, driftSeverityFilter, driftSearch]);

  if (govLoading || driftLoading) return <ExplorerSkeleton />;

  const totalCleanup = Object.values(playbook).reduce((sum, actions) => sum + actions.length, 0);
  const driftHighCount = driftFindings.filter(f => f.severity === "high").length;
  const driftMedCount = driftFindings.filter(f => f.severity === "medium").length;

  const hasGov = !!govData;
  const hasEnv = envKeys.length > 0;

  if (!hasGov && !hasEnv) {
    return (
      <EmptyState
        icon={<DatabaseZap className="w-10 h-10" />}
        title="No data available"
        subtitle="Run the extraction pipeline to populate governance data"
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-background">
      <StatsBar stats={[
        ...(hasGov ? [{ value: String(govFindings.length), label: "Code Findings" }] : []),
        ...(hasEnv ? [
          { value: String(envKeys.length), label: "Environments" },
          { value: String(driftFindings.length), label: "Drift Findings" },
          { value: String(totalCleanup), label: "Cleanup Actions" },
        ] : []),
      ]} />

      {/* Scrollable body */}
      <ScrollArea className="flex-1 h-0">
        <div className="p-4 space-y-6 max-w-7xl mx-auto">

          {/* ═══════════ CODE ═══════════ */}
          {hasGov && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wide border-b pb-1">Code</h2>

              {/* Code Quality with score gauge */}
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Code Quality ({govFindings.length} findings)
                </h3>
                <div className="flex items-start gap-4 mb-3">
                  <ScoreGauge score={govData!.summary.score} />
                  <div className="flex flex-col gap-2 pt-1">
                    <div className="flex gap-2 flex-wrap">
                      {Object.entries(SEVERITY_CONFIG).map(([key, cfg]) => {
                        const count = govData!.summary.bySeverity[key] || 0;
                        return (
                          <button
                            key={key}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors ${
                              govSeverityFilter === key ? `${cfg.bg} ${cfg.color}` : "hover:bg-accent/50"
                            } ${count === 0 ? "opacity-40" : ""}`}
                            onClick={() => setGovSeverityFilter(govSeverityFilter === key ? null : key)}
                          >
                            <cfg.icon className={`w-3 h-3 ${cfg.color}`} />
                            <span className="font-medium">{count}</span>
                            <span className={govSeverityFilter === key ? "" : "text-muted-foreground"}>{cfg.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search rules..."
                        value={govSearch}
                        onChange={e => setGovSearch(e.target.value)}
                        className="pl-8 h-7 text-xs w-64"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  {govFindings.map(finding => (
                    <GovFindingRow key={finding.ruleId} finding={finding} onNavigate={navigateToTab} />
                  ))}
                  {govFindings.length === 0 && (
                    <div className="p-3 text-xs text-muted-foreground text-center">No findings match</div>
                  )}
                </div>
              </section>
            </div>
          )}

          {/* ═══════════ ENVIRONMENT ═══════════ */}
          {hasEnv && (
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wide border-b pb-1">Environment</h2>

              {/* Environment Overview Cards */}
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

              {/* Cleanup Playbook */}
              {totalCleanup > 0 && (
                <section>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Cleanup Playbook ({totalCleanup} actions)
                  </h3>
                  <div className="space-y-1">
                    {envKeys.map(envKey => {
                      const actions = playbook[envKey];
                      if (!actions || actions.length === 0) return null;
                      return (
                        <AccordionSection
                          key={envKey}
                          title={`${ENV_NAMES[envKey] || envKey} (${actions.length} actions)`}
                          lucideIcon={Server}
                        >
                          {[1, 2, 3].map(phase => {
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
                </section>
              )}

              {/* Environment Drift */}
              {driftFindings.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Drift ({driftFindings.length} findings)
                  </h3>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="relative flex-1 max-w-xs">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search drift..."
                        value={driftSearch}
                        onChange={e => setDriftSearch(e.target.value)}
                        className="pl-8 h-7 text-xs"
                      />
                    </div>
                    {(["high", "medium"] as const).map(key => {
                      const cfg = SEVERITY_CONFIG[key]!;
                      const count = key === "high" ? driftHighCount : driftMedCount;
                      return (
                        <button
                          key={key}
                          onClick={() => setDriftSeverityFilter(driftSeverityFilter === key ? null : key)}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors ${
                            driftSeverityFilter === key ? `${cfg.bg} ${cfg.color}` : "hover:bg-accent"
                          }`}
                        >
                          <cfg.icon className={`w-3 h-3 ${cfg.color}`} />
                          <span className="font-medium">{count}</span>
                          <span className={driftSeverityFilter === key ? "" : "text-muted-foreground"}>{cfg.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="border rounded-lg">
                    <ScrollArea className="h-[400px]">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-background z-10">
                          <tr className="border-b bg-muted/30">
                            <th className="text-left px-3 py-1.5 font-medium">Severity</th>
                            <th className="text-left px-3 py-1.5 font-medium">Type</th>
                            <th className="text-left px-3 py-1.5 font-medium">Solution</th>
                            <th className="text-left px-3 py-1.5 font-medium">Detail</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredDrift.slice(0, 100).map((f, i) => {
                            const cfg = (SEVERITY_CONFIG[f.severity] || SEVERITY_CONFIG.medium)!;
                            return (
                              <tr key={i} className="border-b last:border-b-0 hover:bg-accent/30">
                                <td className="px-3 py-1">
                                  <Badge variant="secondary" className={`${cfg.bg} ${cfg.color} gap-1 text-[10px]`}>
                                    <cfg.icon className="w-3 h-3" /> {cfg.label}
                                  </Badge>
                                </td>
                                <td className="px-3 py-1 text-muted-foreground whitespace-nowrap">{f.type.replace(/_/g, " ")}</td>
                                <td className="px-3 py-1 font-mono">{f.solution}</td>
                                <td className="px-3 py-1 text-muted-foreground">{f.detail}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </ScrollArea>
                  </div>
                </section>
              )}

              {/* Solution Presence Gaps */}
              {presenceGaps.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Solution Presence Gaps ({presenceGaps.length})
                  </h3>
                  <div className="border rounded-lg">
                    <ScrollArea className="h-[400px]">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-background z-10">
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
                    </ScrollArea>
                  </div>
                </section>
              )}
            </div>
          )}

        </div>
      </ScrollArea>
    </div>
  );
}

// ---- Expandable governance finding row ----

function GovFindingRow({ finding, onNavigate }: { finding: GovernanceFinding; onNavigate: (tabId: string, name: string) => void }) {
  const cfg = (SEVERITY_CONFIG[finding.severity] || SEVERITY_CONFIG.info)!;
  const isComponent = finding.scope === "component";
  const targetTab = isComponent && finding.componentType ? COMPONENT_TYPE_TO_TAB[finding.componentType] : undefined;

  return (
    <AccordionSection
      title={`${finding.ruleId} - ${finding.name}`}
      lucideIcon={cfg.icon}
    >
      <div className="px-2 py-1 space-y-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge className={`text-[10px] ${cfg.bg} ${cfg.color} border-0`}>{cfg.label}</Badge>
          <Badge variant="outline" className="text-[10px]">{finding.category}</Badge>
          {finding.count > 0 && (
            <Badge variant="secondary" className="text-[10px]">{finding.count} items</Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{finding.message}</p>

        {finding.recommendation && (
          <div className="bg-muted rounded px-2 py-1.5 text-xs border-l-2 border-amber-400">
            <span className="font-medium text-muted-foreground">Recommendation: </span>
            {finding.recommendation}
          </div>
        )}

        {finding.items.length > 0 && (
          <div className="space-y-0.5">
            <div className="text-[10px] font-medium text-muted-foreground">Affected ({finding.items.length})</div>
            {finding.items.slice(0, 20).map((item, idx) => {
              const detail = finding.itemDetails?.[item]?.detail;
              const clickable = !!targetTab;
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-2 px-1 py-0.5 rounded text-xs ${
                    clickable ? "cursor-pointer hover:bg-accent/50" : ""
                  }`}
                  onClick={clickable ? () => onNavigate(targetTab!, item) : undefined}
                >
                  <ChevronRight className={`w-2.5 h-2.5 shrink-0 ${clickable ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={`flex-1 truncate ${clickable ? "text-primary" : ""}`}>{item}</span>
                  {detail && <span className="text-[10px] text-muted-foreground shrink-0">{detail}</span>}
                </div>
              );
            })}
            {finding.items.length > 20 && (
              <div className="text-[10px] text-muted-foreground px-1">...and {finding.items.length - 20} more</div>
            )}
          </div>
        )}
      </div>
    </AccordionSection>
  );
}
