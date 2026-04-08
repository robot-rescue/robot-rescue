import React, { useEffect, useState } from "react";
import { formatDistanceToNowStrict, differenceInMinutes } from "date-fns";
import { Clock } from "lucide-react";

export function IncidentTimer({ timestamp }: { timestamp: string }) {
  const [timeText, setTimeText] = useState("");
  const [isLate, setIsLate] = useState(false);
  const [isWarning, setIsWarning] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      try {
        const date = new Date(timestamp);
        setTimeText(formatDistanceToNowStrict(date));
        const diffMins = differenceInMinutes(new Date(), date);
        setIsLate(diffMins > 30);
        setIsWarning(diffMins > 15 && diffMins <= 30);
      } catch {
        setTimeText("--");
      }
    };
    updateTime();
    const iv = setInterval(updateTime, 1000);
    return () => clearInterval(iv);
  }, [timestamp]);

  const colorClass = isLate ? 'text-red-500' : isWarning ? 'text-amber-500' : 'text-emerald-500';

  return (
    <div className={`flex items-center text-xs font-mono font-bold ${colorClass}`}>
      <Clock className="w-3 h-3 mr-1.5" />
      {timeText}
    </div>
  );
}

export function SeverityBadge({ severity }: { severity: string }) {
  const getSeverityStyle = (sev: string) => {
    switch (sev.toLowerCase()) {
      case "high":   return "bg-red-500/10 text-red-500 border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.2)]";
      case "medium": return "bg-amber-500/10 text-amber-500 border-amber-500/50";
      case "low":    return "bg-blue-500/10 text-blue-400 border-blue-500/50";
      default:       return "bg-zinc-500/10 text-zinc-400 border-zinc-500/50";
    }
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-widest border whitespace-nowrap ${getSeverityStyle(severity)}`}>
      {severity.toLowerCase() === "high" && (
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
      )}
      {severity}
    </span>
  );
}

// 4-state lifecycle badge:
//   UNASSIGNED  → gray   (status=waiting, no assignedTo)
//   ASSIGNED    → blue   (status=waiting, assignedTo is set)
//   IN PROGRESS → orange (status=in_progress)
//   RESOLVED    → green  (status=resolved)
export function StatusBadge({
  status,
  assignedTo,
}: {
  status: string;
  assignedTo?: string | null;
}) {
  const rawStatus = status.toLowerCase();
  const isAssigned = rawStatus === 'waiting' && !!assignedTo;
  const displayState = isAssigned ? 'assigned' : rawStatus;

  const config: Record<string, { dot: string; label: string; text: string }> = {
    waiting: {
      dot: 'bg-zinc-500',
      label: 'UNASSIGNED',
      text: 'text-zinc-400',
    },
    assigned: {
      dot: 'bg-blue-500 animate-pulse',
      label: 'ASSIGNED',
      text: 'text-blue-400',
    },
    in_progress: {
      dot: 'bg-orange-500 animate-pulse',
      label: 'IN PROGRESS',
      text: 'text-orange-400',
    },
    resolved: {
      dot: 'bg-emerald-500',
      label: 'RESOLVED',
      text: 'text-emerald-500',
    },
  };

  const c = config[displayState] ?? config['waiting'];

  return (
    <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider font-bold whitespace-nowrap">
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.dot}`} />
      <span className={c.text}>{c.label}</span>
    </div>
  );
}

// Operator avatar + name chip
const OPERATOR_COLORS: Record<string, string> = {
  "Alex Chen":          "bg-cyan-600",
  "Sarah Kim":          "bg-violet-600",
  "Jordan Patel":       "bg-amber-600",
  "Darren Watkins Jr.": "bg-emerald-600",
};
const OPERATOR_INITIALS: Record<string, string> = {
  "Alex Chen":          "AC",
  "Sarah Kim":          "SK",
  "Jordan Patel":       "JP",
  "Darren Watkins Jr.": "DW",
};

export function OperatorChip({
  name,
  size = "sm",
}: {
  name: string | null | undefined;
  size?: "sm" | "md";
}) {
  if (!name) {
    return (
      <span className="text-xs font-mono text-muted-foreground/50 italic">Unassigned</span>
    );
  }
  const sz = size === "sm" ? "w-6 h-6 text-[9px]" : "w-8 h-8 text-[10px]";
  const color = OPERATOR_COLORS[name] || "bg-zinc-600";
  const initials = OPERATOR_INITIALS[name] || name.slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <div className={`${sz} rounded-full ${color} flex items-center justify-center font-mono font-bold text-white flex-shrink-0`}>
        {initials}
      </div>
      <span className="text-sm font-mono text-foreground">{name}</span>
    </div>
  );
}
