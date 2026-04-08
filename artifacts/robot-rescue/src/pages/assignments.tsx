import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useListIncidents, useUpdateIncident, getListIncidentsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useSimulatedAlerts, getLeastBusyOperator } from "../components/simulated-alerts-provider";
import { useMessages } from "../components/messages-provider";
import { SeverityBadge, StatusBadge, OperatorChip } from "../components/ui-helpers";
import { SearchFilterBar, SeverityFilter, SortKey } from "../components/search-filter-bar";
import { Users, ChevronDown, MapPin, CheckCircle2, UserMinus, ExternalLink, Zap, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

export const OPERATORS = [
  { id: "unassigned",      name: "Unassigned",         initials: "--", color: "bg-zinc-600" },
  { id: "alex-chen",       name: "Alex Chen",           initials: "AC", color: "bg-cyan-600" },
  { id: "sarah-kim",       name: "Sarah Kim",           initials: "SK", color: "bg-violet-600" },
  { id: "jordan-patel",    name: "Jordan Patel",        initials: "JP", color: "bg-amber-600" },
  { id: "darren-watkins",  name: "Darren Watkins Jr.",  initials: "DW", color: "bg-emerald-600" },
];

const ACTIVE_OPS = OPERATORS.slice(1);
const SEV_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

type StatusFilterType = "all" | "unassigned" | "assigned" | "in_progress";

function AssignmentDropdown({
  currentAssignee,
  workloads,
  onAssign,
  disabled,
}: {
  currentAssignee: string | null;
  workloads: Record<string, number>;
  onAssign: (name: string | null) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setOpen(v => !v)}
        disabled={disabled}
        className={`flex items-center gap-2 px-3 py-1.5 rounded border text-sm font-mono transition-all min-w-[140px] ${
          disabled
            ? "opacity-40 cursor-not-allowed border-border text-muted-foreground"
            : currentAssignee
            ? "border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 text-blue-300"
            : "border-border bg-secondary/50 hover:border-amber-500/40 hover:bg-amber-500/5 text-muted-foreground hover:text-amber-400"
        }`}
      >
        <span className="flex-1 text-left truncate">
          {currentAssignee ? (
            <OperatorChip name={currentAssignee} size="sm" />
          ) : (
            <span className="flex items-center gap-2 text-muted-foreground">
              <UserMinus className="w-3.5 h-3.5 flex-shrink-0" />
              Unassigned
            </span>
          )}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-64 bg-card border border-border rounded-lg shadow-2xl z-50 overflow-hidden py-1">
            {OPERATORS.map(op => {
              const load = op.id !== "unassigned" ? (workloads[op.name] ?? 0) : null;
              const isCurrent = (currentAssignee || null) === (op.id === "unassigned" ? null : op.name);
              return (
                <button
                  key={op.id}
                  onClick={() => { onAssign(op.id === "unassigned" ? null : op.name); setOpen(false); }}
                  className={`w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-secondary/70 transition-colors text-sm ${
                    isCurrent ? "text-primary bg-primary/5" : "text-foreground"
                  }`}
                >
                  <div className={`w-7 h-7 rounded-full ${op.color} flex items-center justify-center font-mono font-bold text-[10px] text-white flex-shrink-0`}>
                    {op.initials}
                  </div>
                  <span className="flex-1">{op.name}</span>
                  {load !== null && (
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                      load === 0 ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' :
                      load >= 3 ? 'text-red-400 border-red-500/30 bg-red-500/10' :
                      'text-amber-400 border-amber-500/30 bg-amber-500/10'
                    }`}>
                      {load} active
                    </span>
                  )}
                  {isCurrent && <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default function Assignments() {
  const { data: apiIncidents = [], isLoading } = useListIncidents({ status: "active" });
  const { simulatedIncidents, manualAssign, forceAutoAssign } = useSimulatedAlerts();
  const { addSystemMessage } = useMessages();
  const updateIncident = useUpdateIncident();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [query, setQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("severity");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>("all");

  const allActive = useMemo(() => [...apiIncidents, ...simulatedIncidents], [apiIncidents, simulatedIncidents]);

  const workloads = useMemo(() => {
    const wl: Record<string, number> = {};
    for (const op of ACTIVE_OPS) wl[op.name] = 0;
    for (const inc of allActive) {
      if (inc.assignedTo && wl[inc.assignedTo] !== undefined) wl[inc.assignedTo]++;
    }
    return wl;
  }, [allActive]);

  const filtered = useMemo(() => {
    let list = allActive;
    const q = query.trim().toLowerCase();
    if (q) list = list.filter(i =>
      i.robotId.toLowerCase().includes(q) ||
      i.issueType.replace(/_/g, ' ').toLowerCase().includes(q) ||
      i.location.toLowerCase().includes(q) ||
      (i.assignedTo || '').toLowerCase().includes(q)
    );
    if (severityFilter !== "all") list = list.filter(i => i.severity === severityFilter);
    if (assigneeFilter === "unassigned") list = list.filter(i => !i.assignedTo);
    else if (assigneeFilter !== "all") list = list.filter(i => i.assignedTo === assigneeFilter);
    if (statusFilter === "unassigned") list = list.filter(i => !i.assignedTo);
    else if (statusFilter === "assigned") list = list.filter(i => i.assignedTo && i.status !== "in_progress");
    else if (statusFilter === "in_progress") list = list.filter(i => i.status === "in_progress");
    list = [...list].sort((a, b) => {
      if (sortKey === "severity") {
        const sevDiff = (SEV_ORDER[a.severity] ?? 3) - (SEV_ORDER[b.severity] ?? 3);
        if (sevDiff !== 0) return sevDiff;
        // Within same severity: unassigned first
        if (!a.assignedTo && b.assignedTo) return -1;
        if (a.assignedTo && !b.assignedTo) return 1;
        return 0;
      }
      if (sortKey === "oldest") return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
    return list;
  }, [allActive, query, severityFilter, sortKey, assigneeFilter, statusFilter]);

  const assignedCount   = allActive.filter(i => i.assignedTo).length;
  const unassignedCount = allActive.length - assignedCount;
  const inProgressCount = allActive.filter(i => i.status === "in_progress").length;

  const handleAssign = (incidentId: string, robotId: string, isSimulated: boolean, operator: string | null) => {
    if (operator) {
      const incident = allActive.find(i => i.id === incidentId);
      const issueLabel = incident?.issueType.replace(/_/g, ' ') ?? 'unknown issue';
      addSystemMessage(
        operator,
        `New assignment: ${robotId} — ${issueLabel} (${incident?.location ?? ''}).`,
        incidentId,
      );
    }

    if (isSimulated) {
      manualAssign(incidentId, operator);
      toast({
        title: operator ? `Assigned to ${operator}` : "Assignment cleared",
        description: operator
          ? `${robotId} assigned — resolution will begin shortly.`
          : `${robotId} moved back to unassigned.`,
      });
      return;
    }
    updateIncident.mutate(
      { id: incidentId, data: { assignedTo: operator } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListIncidentsQueryKey() });
          toast({
            title: operator ? `Assigned to ${operator}` : "Assignment cleared",
            description: `${robotId} incident updated.`,
          });
        },
      }
    );
  };

  const handleAutoAssign = () => {
    const unassigned = allActive.filter(i => !i.assignedTo);
    if (unassigned.length === 0) {
      toast({ title: "All incidents already assigned", description: "There are no unassigned incidents to distribute." });
      return;
    }
    // Assign API incidents
    const workingLoads = { ...workloads };
    for (const inc of unassigned.filter(i => !i.id.startsWith("SIM-"))) {
      const leastBusy = ACTIVE_OPS.reduce((a, b) =>
        (workingLoads[a.name] ?? 0) <= (workingLoads[b.name] ?? 0) ? a : b
      );
      workingLoads[leastBusy.name] = (workingLoads[leastBusy.name] ?? 0) + 1;
      handleAssign(inc.id, inc.robotId, false, leastBusy.name);
    }
    // Simulated incidents use context's forceAutoAssign (handles lifecycle too)
    forceAutoAssign();
    toast({
      title: `All incidents assigned successfully`,
      description: `${unassigned.length} incident${unassigned.length > 1 ? "s" : ""} distributed to least-loaded operators. Resolution will begin shortly.`,
    });
  };

  const statusFilterOptions: { key: StatusFilterType; label: string; color: string }[] = [
    { key: "all",         label: "All",         color: "" },
    { key: "unassigned",  label: "Unassigned",  color: "text-zinc-400" },
    { key: "assigned",    label: "Assigned",    color: "text-blue-400" },
    { key: "in_progress", label: "In Progress", color: "text-orange-400" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="h-16 px-6 border-b border-border flex items-center justify-between bg-card/50 backdrop-blur-sm">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Assignments
          </h1>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">OPERATOR TASK MANAGEMENT</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-zinc-500" />
              <span className="text-muted-foreground">UNASSIGNED</span>
              <span className={`font-bold ${unassignedCount > 0 ? 'text-amber-400' : 'text-muted-foreground'}`}>{unassignedCount}</span>
            </div>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-muted-foreground">ASSIGNED</span>
              <span className="font-bold text-blue-400">{assignedCount - inProgressCount}</span>
            </div>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              <span className="text-muted-foreground">IN PROGRESS</span>
              <span className={`font-bold ${inProgressCount > 0 ? 'text-orange-400' : 'text-muted-foreground'}`}>{inProgressCount}</span>
            </div>
          </div>
          {unassignedCount > 0 && (
            <button
              onClick={handleAutoAssign}
              className="flex items-center gap-2 px-4 py-2 rounded border border-primary/60 bg-primary/15 text-primary hover:bg-primary/25 text-xs font-mono font-bold transition-all shadow-[0_0_12px_rgba(0,210,255,0.15)] hover:shadow-[0_0_20px_rgba(0,210,255,0.25)]"
            >
              <Zap className="w-3.5 h-3.5" />
              Auto Assign All
            </button>
          )}
        </div>
      </header>

      {/* Operator workload pills */}
      <div className="px-6 py-3 border-b border-border/50 bg-secondary/10 flex items-center gap-3 flex-wrap">
        {ACTIVE_OPS.map(op => {
          const count = workloads[op.name] ?? 0;
          const isSelected = assigneeFilter === op.name;
          return (
            <button
              key={op.id}
              onClick={() => setAssigneeFilter(isSelected ? "all" : op.name)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono transition-all border ${
                isSelected
                  ? 'border-primary/50 bg-primary/10 text-primary'
                  : 'bg-card border-border hover:border-primary/30'
              }`}
            >
              <div className={`w-5 h-5 rounded-full ${op.color} flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0`}>
                {op.initials}
              </div>
              <span className="text-muted-foreground">{op.name.split(' ')[0]}</span>
              <span className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                count === 0 ? 'text-muted-foreground/50' :
                count >= 3 ? 'text-red-400 bg-red-500/10' :
                'text-amber-400 bg-amber-500/10'
              }`}>{count}</span>
            </button>
          );
        })}
        {assigneeFilter !== "all" && (
          <button onClick={() => setAssigneeFilter("all")} className="text-xs text-primary hover:text-primary/80 font-mono transition-colors">
            Clear
          </button>
        )}
      </div>

      {/* Search + filters */}
      <div className="px-6 py-3 border-b border-border/30 bg-secondary/5">
        <SearchFilterBar
          query={query}
          onQueryChange={setQuery}
          severityFilter={severityFilter}
          onSeverityChange={setSeverityFilter}
          sortKey={sortKey}
          onSortChange={setSortKey}
          resultCount={filtered.length}
          totalCount={allActive.length}
          placeholder="Search by robot ID, issue, location, or operator..."
          extraFilters={
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">Status</span>
              <div className="flex gap-1">
                {statusFilterOptions.map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setStatusFilter(opt.key)}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono border transition-all ${
                      statusFilter === opt.key
                        ? "bg-primary/20 text-primary border-primary/40"
                        : "text-muted-foreground border-transparent hover:border-border hover:text-foreground"
                    } ${opt.color}`}
                  >
                    {opt.label}
                    {opt.key === "unassigned" && unassignedCount > 0 && statusFilter !== "unassigned" && (
                      <span className="ml-1 text-amber-400 font-bold">({unassignedCount})</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          }
        />
      </div>

      {/* Helper text banner when unassigned incidents exist */}
      <AnimatePresence>
        {unassignedCount > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mx-6 mt-4 mb-0 px-4 py-3 rounded-lg border border-amber-500/25 bg-amber-500/5 flex items-center gap-3">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <div className="flex-1">
                <span className="text-sm text-amber-400 font-medium">
                  {unassignedCount} unassigned incident{unassignedCount > 1 ? "s" : ""} awaiting assignment.
                </span>
                <span className="text-xs text-muted-foreground ml-2">
                  Assign incidents to an operator to begin resolution.
                </span>
              </div>
              <button
                onClick={handleAutoAssign}
                className="text-xs font-mono font-bold text-amber-400 hover:text-amber-300 transition-colors whitespace-nowrap flex items-center gap-1.5 border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 rounded hover:bg-amber-500/15"
              >
                <Zap className="w-3 h-3" />
                Auto Assign All
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Incidents table */}
      <div className="flex-1 overflow-auto p-6 pt-4">
        {isLoading && allActive.length === 0 ? (
          <div className="space-y-3 mt-2">
            {[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-secondary/50 rounded-lg border border-border animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-56 text-muted-foreground">
            <CheckCircle2 className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-sm font-medium">
              {allActive.length === 0 ? "No active incidents" : "No incidents match your filters"}
            </p>
            <p className="text-xs mt-1">
              {allActive.length === 0 ? "All robots are operating normally." : "Try adjusting your search or filters."}
            </p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg overflow-hidden shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-left px-4 py-3 text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground w-28">Robot</th>
                  <th className="text-left px-4 py-3 text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground">Issue</th>
                  <th className="text-left px-4 py-3 text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground hidden md:table-cell">Location</th>
                  <th className="text-left px-4 py-3 text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground w-24">Severity</th>
                  <th className="text-left px-4 py-3 text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground hidden sm:table-cell w-36">Status</th>
                  <th className="text-right px-4 py-3 text-[11px] font-mono font-bold uppercase tracking-wider text-muted-foreground w-52">Assigned To</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {filtered.map((incident, idx) => {
                    const isSimulated  = incident.id.startsWith("SIM-");
                    const isUnassigned = !incident.assignedTo;
                    const rowClass = incident.severity === 'high' ? 'list-row-high'
                      : incident.severity === 'medium' ? 'list-row-medium'
                      : 'list-row-low';

                    return (
                      <motion.tr
                        key={incident.id}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 20, scale: 0.98 }}
                        transition={{ duration: 0.25, delay: idx < 6 ? idx * 0.03 : 0 }}
                        className={`border-b border-border/30 alt-row ${rowClass} ${isUnassigned ? 'bg-amber-500/[0.03]' : ''}`}
                      >
                        {/* Robot ID — one line, no wrap */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Link href={`/incidents/${incident.id}`} className="flex items-center gap-1.5 group">
                              <span className="font-mono font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                                {incident.robotId}
                              </span>
                              <ExternalLink className="w-3 h-3 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                            </Link>
                            {isSimulated && (
                              <span className="text-[9px] font-mono text-primary/40 bg-primary/5 border border-primary/20 px-1 rounded">SIM</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground capitalize max-w-[160px]">
                          <span className="truncate block">{incident.issueType.replace(/_/g, ' ')}</span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell max-w-[180px]">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{incident.location}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <SeverityBadge severity={incident.severity} />
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell whitespace-nowrap">
                          <StatusBadge status={incident.status} assignedTo={incident.assignedTo} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end">
                            <AssignmentDropdown
                              currentAssignee={incident.assignedTo ?? null}
                              workloads={workloads}
                              onAssign={op => handleAssign(incident.id, incident.robotId, isSimulated, op)}
                              disabled={incident.status === "resolved"}
                            />
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
