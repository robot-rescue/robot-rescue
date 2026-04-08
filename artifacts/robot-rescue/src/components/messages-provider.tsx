import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useSimulatedAlerts } from "./simulated-alerts-provider";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MessageFrom = "system" | "operator" | "self";

export interface ChatMessage {
  id: string;
  from: MessageFrom;
  text: string;
  timestamp: Date;
  incidentId?: string;
}

export interface Conversation {
  operatorName: string;
  messages: ChatMessage[];
  unreadCount: number;
}

interface MessagesContextType {
  conversations: Conversation[];
  addSystemMessage: (operatorName: string, text: string, incidentId?: string) => void;
  sendMessage: (operatorName: string, text: string) => void;
  markConversationRead: (operatorName: string) => void;
  totalUnread: number;
  typingOps: string[];
}

// ─── Operator roster ─────────────────────────────────────────────────────────

export const MSG_OPERATORS = [
  "Alex Chen",
  "Sarah Kim",
  "Jordan Patel",
  "Darren Watkins Jr.",
] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

let msgIdSeq = 0;
function makeId() {
  return `msg-${Date.now()}-${++msgIdSeq}`;
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000);
}
function hoursAgo(h: number): Date {
  return new Date(Date.now() - h * 3_600_000);
}
function minsAgo(m: number): Date {
  return new Date(Date.now() - m * 60_000);
}

// ─── Context-aware reply engine ───────────────────────────────────────────────

type ReplyIntent =
  | "gratitude"
  | "acknowledgement"
  | "check_request"
  | "instruction"
  | "question"
  | "praise"
  | "negative"
  | "default";

function detectIntent(text: string): ReplyIntent {
  const t = text.toLowerCase().trim();

  // Gratitude
  if (/\b(thanks|thank you|thx|ty|cheers|much appreciated)\b/.test(t)) return "gratitude";

  // Praise
  if (/\b(good work|great job|well done|nice work|nice catch|excellent|perfect|awesome|solid|impressive)\b/.test(t)) return "praise";

  // Acknowledgement / short affirmative
  if (/^(ok|okay|sure|got it|understood|copy|roger|alright|noted|right|yep|yes|yeah|k|kk|10-4|10 4)\b/.test(t)) return "acknowledgement";

  // Question
  if (t.endsWith("?") || /\b(what|where|when|how|why|who|which|status|update|progress)\b/.test(t)) return "question";

  // Negative / concern
  if (/\b(no|not|issue|problem|fail|error|wrong|bad|broken|down|offline)\b/.test(t)) return "negative";

  // Check / inspect request
  if (/\b(check|inspect|look|verify|confirm|scan|ping|diagnose|monitor|watch|track|observe)\b/.test(t)) return "check_request";

  // Instruction / task imperative
  if (/\b(go|head|move|reroute|fix|resolve|handle|proceed|activate|restart|stop|halt|start|continue|run|execute|deploy|reset|clear|dispatch|send|bring|get|take|assign|patch|update|report)\b/.test(t)) return "instruction";

  return "default";
}

// Per-intent reply pools (operator-neutral but professional)
const INTENT_REPLIES: Record<ReplyIntent, string[]> = {
  gratitude: [
    "No problem.",
    "Anytime.",
    "Glad to assist.",
    "All good.",
    "That's what we're here for.",
    "Noted.",
  ],
  praise: [
    "Appreciate it.",
    "Thanks, staying on it.",
    "Team effort.",
    "All good here.",
    "Keeping the floor running.",
  ],
  acknowledgement: [
    "👍",
    "Acknowledged.",
    "Copy that.",
    "Standing by.",
    "Understood.",
    "Confirmed.",
  ],
  question: [
    "Stand by, checking.",
    "Let me verify — back shortly.",
    "Pulling data now.",
    "Running query, one moment.",
    "Confirming status.",
  ],
  check_request: [
    "Checking now.",
    "On it — pulling diagnostics.",
    "Running scan.",
    "Querying sensor feed.",
    "Initiating check sequence.",
    "Scanning zone.",
  ],
  instruction: [
    "Acknowledged. Executing.",
    "On it.",
    "Copy. Moving to execute.",
    "In progress.",
    "Confirmed — proceeding.",
    "Understood. Starting now.",
    "Command received.",
  ],
  negative: [
    "Copy. Investigating.",
    "Acknowledged — escalating if needed.",
    "Understood. Running diagnostics.",
    "On it. Will report findings.",
    "Flagged for review.",
  ],
  default: [
    "Copy that.",
    "Acknowledged.",
    "Understood.",
    "Roger.",
    "Confirmed.",
    "Noted.",
    "Standing by.",
  ],
};

// Operator-specific overrides for certain intents to add personality
const OP_OVERRIDES: Record<string, Partial<Record<ReplyIntent, string[]>>> = {
  "Alex Chen": {
    default:     ["Copy. I'm on it.", "Acknowledged.", "Roger that.", "Confirmed.", "Understood."],
    instruction: ["Copy. Executing now.", "On it — updating route.", "Confirmed. In progress.", "Command received."],
  },
  "Sarah Kim": {
    default:     ["Acknowledged. Monitoring.", "Confirmed.", "Copy.", "Understood. Proceeding.", "Noted."],
    question:    ["Pulling data now.", "Checking status feed.", "Verifying — stand by.", "Running query."],
  },
  "Jordan Patel": {
    default:     ["Copy that.", "Acknowledged.", "Roger.", "Understood. On standby.", "Confirmed."],
    check_request: ["Checking now.", "Running sensor sweep.", "Diagnostic underway.", "On it — scanning."],
  },
  "Darren Watkins Jr.": {
    default:     ["Copy. En route.", "Acknowledged.", "Confirmed. Moving.", "Understood.", "Roger."],
    instruction: ["Copy. Activating override.", "On it. Manual intervention.", "Confirmed. Executing.", "Moving now."],
  },
};

function pickReply(operatorName: string, userText: string): string {
  const intent = detectIntent(userText);

  // Prefer operator-specific override for this intent
  const opOverrides = OP_OVERRIDES[operatorName];
  const pool = (opOverrides?.[intent] ?? []).length > 0
    ? opOverrides![intent]!
    : INTENT_REPLIES[intent];

  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── Preloaded seed conversations ─────────────────────────────────────────────

function seedConversations(): Conversation[] {
  return [
    {
      operatorName: "Alex Chen",
      unreadCount: 0,
      messages: [
        { id: makeId(), from: "system",   text: "Incident RX-301 assigned to Alex Chen.",                     timestamp: daysAgo(2),         incidentId: "1001" },
        { id: makeId(), from: "operator", text: "On it — routing to the affected sector now.",                 timestamp: daysAgo(2),         },
        { id: makeId(), from: "system",   text: "RX-301: obstacle detected in Aisle 4. Path blocked.",        timestamp: daysAgo(2),         incidentId: "1001" },
        { id: makeId(), from: "operator", text: "Confirmed visual on object. Activating alternate path B.",   timestamp: hoursAgo(47),       },
        { id: makeId(), from: "self",     text: "What's your ETA on clearance?",                              timestamp: hoursAgo(47),       },
        { id: makeId(), from: "operator", text: "Roughly 4 minutes. Object classified as static debris.",     timestamp: hoursAgo(46),       },
        { id: makeId(), from: "system",   text: "Incident RX-301 resolved successfully.",                     timestamp: hoursAgo(46),       incidentId: "1001" },
        { id: makeId(), from: "operator", text: "Path cleared. Robot resuming nominal operations.",           timestamp: hoursAgo(46),       },
        { id: makeId(), from: "self",     text: "Good work. Moving you to next priority.",                    timestamp: hoursAgo(45),       },
      ],
    },
    {
      operatorName: "Sarah Kim",
      unreadCount: 2,
      messages: [
        { id: makeId(), from: "system",   text: "Incident RX-445 assigned to Sarah Kim.",                     timestamp: hoursAgo(26),       incidentId: "1002" },
        { id: makeId(), from: "operator", text: "Acknowledged. Battery critical — monitoring charge status.", timestamp: hoursAgo(25),       },
        { id: makeId(), from: "system",   text: "High priority alert: RX-445 battery below 5%.",             timestamp: hoursAgo(24),       incidentId: "1002" },
        { id: makeId(), from: "operator", text: "Initiating emergency recharge protocol at Dock 3.",         timestamp: hoursAgo(24),       },
        { id: makeId(), from: "self",     text: "Keep me posted on charge levels.",                           timestamp: hoursAgo(23),       },
        { id: makeId(), from: "system",   text: "Incident RX-445 resolved successfully.",                     timestamp: hoursAgo(23),       incidentId: "1002" },
        { id: makeId(), from: "operator", text: "Charging complete. Unit back to full operational status.",   timestamp: minsAgo(45),        },
        { id: makeId(), from: "operator", text: "RX-934 showing elevated temp readings. Should I monitor?",  timestamp: minsAgo(12),        },
      ],
    },
    {
      operatorName: "Jordan Patel",
      unreadCount: 0,
      messages: [
        { id: makeId(), from: "system",   text: "Incident RX-718 assigned to Jordan Patel.",                  timestamp: hoursAgo(5),        incidentId: "1003" },
        { id: makeId(), from: "operator", text: "RX-718 has intermittent comms. Running diagnostic now.",     timestamp: hoursAgo(5),        },
        { id: makeId(), from: "self",     text: "Suspected RF interference from dock machinery. Check relay.", timestamp: hoursAgo(4.5),     },
        { id: makeId(), from: "operator", text: "Confirmed — relay unit on Bay 7 overheating.",              timestamp: hoursAgo(4),        },
        { id: makeId(), from: "operator", text: "Communication restored after relay reset. All nominal.",     timestamp: hoursAgo(3),        },
        { id: makeId(), from: "system",   text: "Incident RX-718 resolved successfully.",                     timestamp: hoursAgo(3),        incidentId: "1003" },
        { id: makeId(), from: "self",     text: "Nice catch. Log the relay fault for maintenance review.",    timestamp: hoursAgo(2),        },
        { id: makeId(), from: "operator", text: "Logged. Maintenance ticket #MT-0492 filed.",                 timestamp: hoursAgo(1.5),      },
      ],
    },
    {
      operatorName: "Darren Watkins Jr.",
      unreadCount: 1,
      messages: [
        { id: makeId(), from: "system",   text: "Incident RX-204 assigned to Darren Watkins Jr.",             timestamp: hoursAgo(3),        incidentId: "1004" },
        { id: makeId(), from: "operator", text: "Acknowledged. En route to Warehouse B sector.",              timestamp: hoursAgo(3),        },
        { id: makeId(), from: "operator", text: "Path obstruction confirmed — large pallet in main aisle.",   timestamp: hoursAgo(2.5),      },
        { id: makeId(), from: "self",     text: "Activate manual reroute via loading bay entrance.",           timestamp: hoursAgo(2),        },
        { id: makeId(), from: "operator", text: "Manual reroute active. Robot navigating around obstruction.", timestamp: hoursAgo(1.5),     },
        { id: makeId(), from: "system",   text: "Incident RX-204 resolved successfully.",                     timestamp: hoursAgo(1),        incidentId: "1004" },
        { id: makeId(), from: "operator", text: "All clear. Pallet flagged for relocation by ground crew.",   timestamp: minsAgo(20),        },
      ],
    },
  ];
}

// ─── Context ──────────────────────────────────────────────────────────────────

const MessagesContext = createContext<MessagesContextType | null>(null);

export function MessagesProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>(seedConversations);
  const [typingOps, setTypingOps] = useState<string[]>([]);

  const { resolvedSimIncidents } = useSimulatedAlerts();
  const prevResolvedLen = useRef(resolvedSimIncidents.length);

  // ── Watch for newly resolved SIM incidents and inject system messages ──────
  useEffect(() => {
    if (resolvedSimIncidents.length <= prevResolvedLen.current) {
      prevResolvedLen.current = resolvedSimIncidents.length;
      return;
    }
    const newResolved = resolvedSimIncidents.slice(0, resolvedSimIncidents.length - prevResolvedLen.current);
    prevResolvedLen.current = resolvedSimIncidents.length;

    for (const inc of newResolved) {
      if (!inc.assignedTo) continue;
      const operator = MSG_OPERATORS.find(op => op === inc.assignedTo);
      if (!operator) continue;

      injectSystemMessage(
        operator,
        `Incident ${inc.robotId} resolved successfully.`,
        inc.id,
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedSimIncidents]);

  // ── Internal helpers (no dependency on state setters to avoid stale closures)
  function injectSystemMessage(operatorName: string, text: string, incidentId?: string) {
    setConversations(prev =>
      prev.map(conv => {
        if (conv.operatorName !== operatorName) return conv;
        return {
          ...conv,
          messages: [
            ...conv.messages,
            { id: makeId(), from: "system", text, timestamp: new Date(), incidentId },
          ],
          unreadCount: conv.unreadCount + 1,
        };
      })
    );
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  const addSystemMessage = useCallback((operatorName: string, text: string, incidentId?: string) => {
    injectSystemMessage(operatorName, text, incidentId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendMessage = useCallback((operatorName: string, text: string) => {
    const newMsg: ChatMessage = {
      id: makeId(),
      from: "self",
      text,
      timestamp: new Date(),
    };

    setConversations(prev =>
      prev.map(conv =>
        conv.operatorName === operatorName
          ? { ...conv, messages: [...conv.messages, newMsg] }
          : conv
      )
    );

    // Simulate operator typing then auto-reply
    const delay = 1_500 + Math.random() * 2_000;
    setTypingOps(prev => [...prev, operatorName]);

    setTimeout(() => {
      setTypingOps(prev => prev.filter(op => op !== operatorName));

      const reply = pickReply(operatorName, text);

      setConversations(prev =>
        prev.map(conv =>
          conv.operatorName === operatorName
            ? {
                ...conv,
                messages: [
                  ...conv.messages,
                  { id: makeId(), from: "operator", text: reply, timestamp: new Date() },
                ],
              }
            : conv
        )
      );
    }, delay);
  }, []);

  const markConversationRead = useCallback((operatorName: string) => {
    setConversations(prev =>
      prev.map(conv =>
        conv.operatorName === operatorName ? { ...conv, unreadCount: 0 } : conv
      )
    );
  }, []);

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <MessagesContext.Provider
      value={{ conversations, addSystemMessage, sendMessage, markConversationRead, totalUnread, typingOps }}
    >
      {children}
    </MessagesContext.Provider>
  );
}

export function useMessages() {
  const ctx = useContext(MessagesContext);
  if (!ctx) throw new Error("useMessages must be used inside MessagesProvider");
  return ctx;
}
