import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { useMessages, MSG_OPERATORS, type ChatMessage, type Conversation } from "../components/messages-provider";
import { useSimulatedAlerts } from "../components/simulated-alerts-provider";
import { useListIncidents } from "@workspace/api-client-react";
import {
  MessageSquare, Send, Zap, ChevronRight, AlertOctagon, CheckCircle2,
  AlertTriangle, Radio,
} from "lucide-react";

// ─── Operator appearance ──────────────────────────────────────────────────────

const OP_COLOR: Record<string, string> = {
  "Alex Chen":           "bg-cyan-600",
  "Sarah Kim":           "bg-violet-600",
  "Jordan Patel":        "bg-amber-600",
  "Darren Watkins Jr.":  "bg-emerald-600",
};
const OP_INITIALS: Record<string, string> = {
  "Alex Chen":           "AC",
  "Sarah Kim":           "SK",
  "Jordan Patel":        "JP",
  "Darren Watkins Jr.":  "DW",
};

// ─── Status calculation ───────────────────────────────────────────────────────

type OpStatus = "busy" | "online" | "idle";

function useOperatorStatuses(): Record<string, OpStatus> {
  const { simulatedIncidents } = useSimulatedAlerts();
  const { data: apiIncidents = [] } = useListIncidents({ status: "active" });
  const allActive = useMemo(() => [...simulatedIncidents, ...apiIncidents], [simulatedIncidents, apiIncidents]);

  return useMemo(() => {
    const statuses: Record<string, OpStatus> = {};
    for (const op of MSG_OPERATORS) {
      const assigned = allActive.filter(i => i.assignedTo === op);
      if (assigned.some(i => i.status === "in_progress")) {
        statuses[op] = "busy";
      } else if (assigned.length > 0) {
        statuses[op] = "online";
      } else {
        statuses[op] = "idle";
      }
    }
    return statuses;
  }, [allActive]);
}

// ─── Time formatting ──────────────────────────────────────────────────────────

function fmtTime(d: Date): string {
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtFullTime(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

// ─── Status dot ───────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: OpStatus }) {
  if (status === "busy")
    return <span className="w-2.5 h-2.5 rounded-full bg-orange-400 animate-pulse shadow-[0_0_6px_theme(colors.orange.400)]" />;
  if (status === "online")
    return <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_4px_theme(colors.emerald.400)]" />;
  return <span className="w-2.5 h-2.5 rounded-full bg-zinc-600" />;
}

function statusLabel(s: OpStatus) {
  if (s === "busy") return { text: "HANDLING INCIDENT", color: "text-orange-400" };
  if (s === "online") return { text: "ONLINE", color: "text-emerald-400" };
  return { text: "IDLE", color: "text-zinc-500" };
}

// ─── Single message bubble ────────────────────────────────────────────────────

function MessageBubble({
  msg,
  operatorName,
  onIncidentClick,
}: {
  msg: ChatMessage;
  operatorName: string;
  onIncidentClick: (id: string) => void;
}) {
  const isSystem = msg.from === "system";
  const isSelf   = msg.from === "self";

  if (isSystem) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-center gap-2 py-1"
      >
        <div className="h-px flex-1 bg-border/40" />
        <div
          className={`flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground/70 px-2 py-0.5 rounded-full bg-secondary/40 border border-border/30 ${msg.incidentId ? "cursor-pointer hover:text-primary hover:border-primary/30 transition-colors" : ""}`}
          onClick={() => msg.incidentId && onIncidentClick(msg.incidentId)}
        >
          <Radio className="w-3 h-3 flex-shrink-0" />
          <span>{msg.text}</span>
          {msg.incidentId && <ChevronRight className="w-3 h-3 flex-shrink-0 opacity-60" />}
        </div>
        <div className="h-px flex-1 bg-border/40" />
      </motion.div>
    );
  }

  if (isSelf) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex flex-col items-end gap-0.5"
      >
        <div className="max-w-[72%] bg-primary/15 border border-primary/25 text-foreground text-sm rounded-lg rounded-tr-sm px-3 py-2">
          {msg.text}
        </div>
        <span className="text-[10px] font-mono text-muted-foreground/50 mr-1">{fmtFullTime(msg.timestamp)}</span>
      </motion.div>
    );
  }

  // operator message
  const initials = OP_INITIALS[operatorName] ?? "??";
  const color    = OP_COLOR[operatorName] ?? "bg-zinc-600";
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-end gap-2"
    >
      <div className={`w-6 h-6 rounded ${color} flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0 mb-0.5`}>
        {initials}
      </div>
      <div className="flex flex-col gap-0.5 max-w-[72%]">
        <div className="bg-card border border-border/60 text-foreground text-sm rounded-lg rounded-bl-sm px-3 py-2">
          {msg.text}
        </div>
        <span className="text-[10px] font-mono text-muted-foreground/50 ml-1">{fmtFullTime(msg.timestamp)}</span>
      </div>
    </motion.div>
  );
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingIndicator({ operatorName }: { operatorName: string }) {
  const initials = OP_INITIALS[operatorName] ?? "??";
  const color    = OP_COLOR[operatorName] ?? "bg-zinc-600";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      className="flex items-end gap-2"
    >
      <div className={`w-6 h-6 rounded ${color} flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0`}>
        {initials}
      </div>
      <div className="bg-card border border-border/60 rounded-lg rounded-bl-sm px-3 py-2.5 flex items-center gap-1">
        {[0, 0.15, 0.3].map((delay, i) => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50"
            animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
            transition={{ duration: 0.9, delay, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const QUICK_REPLIES = [
  "Acknowledged",
  "On it",
  "Escalating to supervisor",
  "Stand by",
];

export default function Messages() {
  const { conversations, sendMessage, markConversationRead, typingOps } = useMessages();
  const statuses = useOperatorStatuses();
  const [, setLocation] = useLocation();

  const [selected, setSelected] = useState<string>(MSG_OPERATORS[0]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const activeConv: Conversation | undefined = conversations.find(c => c.operatorName === selected);

  // Mark as read when opening
  useEffect(() => {
    markConversationRead(selected);
  }, [selected, markConversationRead]);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConv?.messages.length, typingOps]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    sendMessage(selected, text);
    setInput("");
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleIncidentClick = (incidentId: string) => {
    setLocation(`/incidents/${incidentId}`);
  };

  const isTyping = typingOps.includes(selected);

  // Sort conversations: unread first, then by last-message timestamp
  const sortedConvs = useMemo(() => {
    return [...conversations].sort((a, b) => {
      if (b.unreadCount !== a.unreadCount) return b.unreadCount - a.unreadCount;
      const aLast = a.messages.at(-1)?.timestamp ?? new Date(0);
      const bLast = b.messages.at(-1)?.timestamp ?? new Date(0);
      return bLast.getTime() - aLast.getTime();
    });
  }, [conversations]);

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Left panel: Inbox ─────────────────────────────────────────────── */}
      <aside className="w-72 flex-shrink-0 border-r border-border bg-sidebar flex flex-col">
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-border bg-card/40">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            <span className="font-bold text-sm tracking-tight text-foreground">Communications</span>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider">
            {conversations.reduce((s, c) => s + c.unreadCount, 0) > 0
              ? `${conversations.reduce((s, c) => s + c.unreadCount, 0)} unread`
              : "All read"}
          </span>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {sortedConvs.map(conv => {
            const isActive = conv.operatorName === selected;
            const lastMsg  = conv.messages.at(-1);
            const status   = statuses[conv.operatorName] ?? "idle";
            return (
              <button
                key={conv.operatorName}
                onClick={() => setSelected(conv.operatorName)}
                className={`w-full text-left px-4 py-3.5 flex items-start gap-3 border-b border-border/40 transition-colors ${
                  isActive
                    ? "bg-primary/10 border-l-2 border-l-primary"
                    : "hover:bg-secondary/50 border-l-2 border-l-transparent"
                }`}
              >
                {/* Avatar + status dot */}
                <div className="relative flex-shrink-0 mt-0.5">
                  <div className={`w-9 h-9 rounded ${OP_COLOR[conv.operatorName]} flex items-center justify-center text-xs font-bold text-white`}>
                    {OP_INITIALS[conv.operatorName]}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5">
                    <StatusDot status={status} />
                  </div>
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className={`text-sm font-semibold truncate ${isActive ? "text-primary" : "text-foreground"}`}>
                      {conv.operatorName}
                    </span>
                    {lastMsg && (
                      <span className="text-[10px] font-mono text-muted-foreground/50 flex-shrink-0 ml-1">
                        {fmtTime(lastMsg.timestamp)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {typingOps.includes(conv.operatorName) ? (
                      <span className="text-xs text-primary/70 italic font-mono">typing…</span>
                    ) : lastMsg ? (
                      <span className={`text-xs truncate ${conv.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                        {lastMsg.from === "self" ? "You: " : lastMsg.from === "system" ? "⟨system⟩ " : ""}
                        {lastMsg.text.length > 45 ? lastMsg.text.slice(0, 45) + "…" : lastMsg.text}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">No messages</span>
                    )}
                    {conv.unreadCount > 0 && (
                      <span className="ml-auto flex-shrink-0 w-4 h-4 rounded-full bg-primary text-[9px] font-bold text-primary-foreground flex items-center justify-center">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* ── Right panel: Thread ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        {/* Thread header */}
        {(() => {
          const status = statuses[selected] ?? "idle";
          const sl = statusLabel(status);
          return (
            <div className="h-14 flex items-center gap-3 px-5 border-b border-border bg-card/30 backdrop-blur-sm flex-shrink-0">
              <div className="relative">
                <div className={`w-9 h-9 rounded ${OP_COLOR[selected]} flex items-center justify-center text-sm font-bold text-white`}>
                  {OP_INITIALS[selected]}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5">
                  <StatusDot status={status} />
                </div>
              </div>
              <div>
                <div className="font-semibold text-sm text-foreground">{selected}</div>
                <div className={`text-[10px] font-mono ${sl.color} flex items-center gap-1`}>
                  {status === "busy" && <AlertOctagon className="w-2.5 h-2.5" />}
                  {status === "online" && <CheckCircle2 className="w-2.5 h-2.5" />}
                  {status === "idle" && <AlertTriangle className="w-2.5 h-2.5 opacity-40" />}
                  {sl.text}
                </div>
              </div>
              {status === "busy" && (
                <div className="ml-auto text-[10px] font-mono text-orange-400/70 bg-orange-400/5 border border-orange-400/15 px-2 py-0.5 rounded flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                  ACTIVE INCIDENT IN PROGRESS
                </div>
              )}
            </div>
          );
        })()}

        {/* Message thread */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
          {activeConv?.messages.map(msg => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              operatorName={selected}
              onIncidentClick={handleIncidentClick}
            />
          ))}

          <AnimatePresence>
            {isTyping && <TypingIndicator key="typing" operatorName={selected} />}
          </AnimatePresence>

          <div ref={bottomRef} />
        </div>

        {/* Quick replies */}
        <div className="px-5 pt-2 pb-0 flex items-center gap-2 flex-wrap">
          {QUICK_REPLIES.map(qr => (
            <button
              key={qr}
              onClick={() => { sendMessage(selected, qr); }}
              className="text-[11px] font-mono text-muted-foreground border border-border/60 hover:border-primary/40 hover:text-primary hover:bg-primary/5 px-2.5 py-1 rounded transition-all"
            >
              {qr}
            </button>
          ))}
          <span className="text-[10px] font-mono text-muted-foreground/30 ml-1">quick reply</span>
        </div>

        {/* Input bar */}
        <div className="px-5 py-3 border-t border-border/60 flex items-center gap-3 flex-shrink-0">
          <div className="flex-1 flex items-center gap-2 bg-card border border-border/70 rounded-lg px-3 py-2 focus-within:border-primary/40 transition-colors">
            <input
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 outline-none font-sans"
              placeholder={`Message ${selected.split(" ")[0]}…`}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
            />
            {isTyping && (
              <span className="text-[10px] font-mono text-muted-foreground/50 flex-shrink-0">
                {selected.split(" ")[0]} is typing…
              </span>
            )}
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-primary/15 border border-primary/30 text-primary hover:bg-primary/25 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
