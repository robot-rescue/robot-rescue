import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useListIncidents } from "@workspace/api-client-react";
import { useSimulatedAlerts } from "../components/simulated-alerts-provider";
import { IncidentTimer, SeverityBadge, StatusBadge } from "../components/ui-helpers";
import { Activity, AlertOctagon, Bot, MapPin, LayoutGrid, List } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

type SeverityFilter = "all" | "high" | "medium" | "low";
type StatusFilter = "all" | "waiting" | "in_progress";
type QuickFilter = "all" | "critical";
type ViewMode = "grid" | "list";
type SortKey = "newest" | "severity" | "time_open";

function usePersistedState<T>(key: string, init: T): [T, (v: T) => void] {
  const [val, setVal] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : init;
    } catch {
      return init;
    }
  });
  const set = (v: T) => {
    setVal(v);
    try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
  };
  return [val, set];
}

const SEV_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

export default function Dashboard() {
  const { simulatedIncidents } = useSimulatedAlerts();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const prevSimCount = useRef(simulatedIncidents.length);

  const [viewMode, setViewMode] = usePersistedState<ViewMode>("dash_viewMode", "grid");
  const [quickFilter, setQuickFilter] = usePersistedState<QuickFilter>("dash_quickFilter", "all");
  const [severityFilter, setSeverityFilter] = usePersistedState<SeverityFilter>("dash_severityFilter", "all");
  const [statusFilter, setStatusFilter] = usePersistedState<StatusFilter>("dash_statusFilter", "all");
  const [sortKey, setSortKey] = usePersistedState<SortKey>("dash_sortKey", "newest");

  const { data: apiIncidents = [], isLoading } = useListIncidents({ status: "active" });

  useEffect(() => {
    if (simulatedIncidents.length > prevSimCount.current) {
      const newest = simulatedIncidents[0];
      if (newest) {
        toast({
          title: `New alert: ${newest.robotId} — ${newest.issueType.replace(/_/g, ' ')}`,
          description: `Location: ${newest.location}`,
          variant: newest.severity === 'high' ? 'destructive' : 'default',
        });
      }
    }
    prevSimCount.current = simulatedIncidents.length;
  }, [simulatedIncidents, toast]);

  const allActiveIncidents = useMemo(() => {
    return [...simulatedIncidents, ...apiIncidents].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [apiIncidents, simulatedIncidents]);

  const filtered = useMemo(() => {
    let list = allActiveIncidents;
    if (quickFilter === "critical") list = list.filter(i => i.severity === "high");
    if (severityFilter !== "all") list = list.filter(i => i.severity === severityFilter);
    if (statusFilter !== "all") list = list.filter(i => i.status === statusFilter);
    list = [...list].sort((a, b) => {
      if (sortKey === "severity") return SEV_ORDER[a.severity] - SEV_ORDER[b.severity];
      if (sortKey === "time_open")
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
    return list;
  }, [allActiveIncidents, quickFilter, severityFilter, statusFilter, sortKey]);

  const highSeverityCount = allActiveIncidents.filter(i => i.severity === 'high').length;

  const SEVERITY_TABS: { label: string; value: SeverityFilter; color: string }[] = [
    { label: "All", value: "all", color: "text-foreground" },
    { label: "High", value: "high", color: "text-red-500" },
    { label: "Medium", value: "medium", color: "text-amber-500" },
    { label: "Low", value: "low", color: "text-blue-400" },
  ];

  const STATUS_TABS: { label: string; value: StatusFilter }[] = [
    { label: "Any Status", value: "all" },
    { label: "Waiting", value: "waiting" },
    { label: "In Progress", value: "in_progress" },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-3 border-b border-border/50 bg-secondary/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setQuickFilter("all"); setSeverityFilter("all"); }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono font-bold transition-colors ${quickFilter === "all" && severityFilter === "all" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              <span>ACTIVE ALERTS</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${quickFilter === "all" && severityFilter === "all" ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}>
                {allActiveIncidents.length}
              </span>
            </button>
            <button
              onClick={() => { setQuickFilter("critical"); setSeverityFilter("all"); }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono font-bold transition-colors ${quickFilter === "critical" ? "bg-red-500/15 text-red-500" : "text-muted-foreground hover:text-foreground"}`}
            >
              <span>CRITICAL</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${quickFilter === "critical" ? "bg-red-500/20 text-red-500" : "bg-secondary text-muted-foreground"}`}>
                {highSeverityCount}
              </span>
            </button>
          </div>
          <div className="flex items-center gap-2 text-emerald-500 text-xs font-mono">
            <Activity className="w-3 h-3" />
            <span>FLEET NOMINAL</span>
          </div>
        </div>
      </div>

      <div className="px-6 py-2 border-b border-border/30 bg-secondary/10 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1">
          {SEVERITY_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => { setSeverityFilter(tab.value); setQuickFilter("all"); }}
              className={`px-2.5 py-1 rounded text-[11px] font-mono font-medium transition-colors border ${severityFilter === tab.value ? `${tab.color} border-current bg-current/10` : "text-muted-foreground border-transparent hover:border-border"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-border" />

        <div className="flex items-center gap-1">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-2.5 py-1 rounded text-[11px] font-mono font-medium transition-colors border ${statusFilter === tab.value ? "text-primary border-primary/40 bg-primary/10" : "text-muted-foreground border-transparent hover:border-border"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-border" />

        <div className="flex items-center gap-1">
          <select
            value={sortKey}
            onChange={e => setSortKey(e.target.value as SortKey)}
            className="bg-secondary/50 border border-border rounded px-2 py-1 text-[11px] font-mono text-muted-foreground focus:outline-none focus:border-primary/40"
          >
            <option value="newest">Newest first</option>
            <option value="severity">By severity</option>
            <option value="time_open">Time open</option>
          </select>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded transition-colors ${viewMode === "grid" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"}`}
            title="Grid view"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-1.5 rounded transition-colors ${viewMode === "list" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"}`}
            title="List view"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {isLoading && apiIncidents.length === 0 ? (
          <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" : "flex flex-col gap-2"}>
            {[1,2,3,4].map(i => (
              <div key={i} className={`bg-secondary/50 rounded-lg border border-border animate-pulse ${viewMode === "grid" ? "h-48" : "h-14"}`} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Bot className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-sm font-medium">No incidents match your filters</p>
            <button
              onClick={() => { setQuickFilter("all"); setSeverityFilter("all"); setStatusFilter("all"); }}
              className="mt-3 text-xs text-primary hover:text-primary/80 font-mono underline underline-offset-2"
            >
              Clear all filters
            </button>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <AnimatePresence>
              {filtered.map((incident) => {
                const severityClass = incident.severity === 'high' ? 'incident-card-high' : incident.severity === 'medium' ? 'incident-card-medium' : 'incident-card-low';
                return (
                  <motion.div
                    key={incident.id}
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Link href={`/incidents/${incident.id}`}>
                      <div className={`group block bg-card/80 backdrop-blur rounded-lg border border-border cursor-pointer transition-all duration-250 hover:scale-[1.015] ${severityClass}`}>
                        <div className="p-4 border-b border-border/40 flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <AlertOctagon className={`w-5 h-5 ${incident.severity === 'high' ? 'text-red-500 animate-pulse' : incident.severity === 'medium' ? 'text-amber-500' : 'text-blue-400'}`} />
                            <span className="font-mono font-bold text-lg text-foreground">{incident.robotId}</span>
                          </div>
                          <SeverityBadge severity={incident.severity} />
                        </div>
                        <div className="p-4 space-y-4">
                          <div>
                            <div className="text-sm font-semibold mb-1 truncate text-foreground">
                              {incident.issueType.replace(/_/g, ' ').toUpperCase()}
                            </div>
                            <div className="flex items-center text-xs text-muted-foreground font-mono">
                              <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />{incident.location}
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <StatusBadge status={incident.status} assignedTo={incident.assignedTo} />
                            <IncidentTimer timestamp={incident.timestamp} />
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-4 py-3 text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">Robot ID</th>
                  <th className="text-left px-4 py-3 text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">Issue</th>
                  <th className="text-left px-4 py-3 text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground hidden md:table-cell">Location</th>
                  <th className="text-left px-4 py-3 text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">Severity</th>
                  <th className="text-left px-4 py-3 text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="text-right px-4 py-3 text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">Time Open</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filtered.map((incident, idx) => {
                    const rowClass = incident.severity === 'high' ? 'list-row-high' : incident.severity === 'medium' ? 'list-row-medium' : 'list-row-low';
                    return (
                    <motion.tr
                      key={incident.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={`border-b border-border/30 alt-row cursor-pointer ${rowClass}`}
                      onClick={() => setLocation(`/incidents/${incident.id}`)}
                    >
                      <td className="px-4 py-3">
                        <Link href={`/incidents/${incident.id}`}>
                          <span className="font-mono font-bold text-sm text-foreground hover:text-primary transition-colors">
                            {incident.robotId}
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground capitalize">
                        {incident.issueType.replace(/_/g, ' ')}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">{incident.location}</td>
                      <td className="px-4 py-3"><SeverityBadge severity={incident.severity} /></td>
                      <td className="px-4 py-3"><StatusBadge status={incident.status} assignedTo={incident.assignedTo} /></td>
                      <td className="px-4 py-3 text-right"><IncidentTimer timestamp={incident.timestamp} /></td>
                    </motion.tr>
                  );})}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
