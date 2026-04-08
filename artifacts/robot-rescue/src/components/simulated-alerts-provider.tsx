import React, {
  createContext, useContext, useEffect, useRef, useState, useCallback,
} from 'react';
import { Incident, IncidentIssueType, IncidentSeverity, IncidentStatus } from '@workspace/api-client-react';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  incident: Incident;
  timestamp: string;
  read: boolean;
}

export interface ActivityEvent {
  id: string;
  type: 'created' | 'assigned' | 'in_progress' | 'resolved';
  message: string;
  detail: string;
  time: Date;
  severity?: string;
  incidentId: string;
  robotId: string;
}

export interface ToastItem {
  id: string;
  title: string;
  description: string;
  variant: 'default' | 'destructive';
}

interface SimulatedAlertsContextType {
  simulatedIncidents: Incident[];
  resolvedSimIncidents: Incident[];
  notifications: Notification[];
  activityLog: ActivityEvent[];
  toastQueue: ToastItem[];
  unreadCount: number;
  markAllRead: () => void;
  markOneRead: (id: string) => void;
  removeSimulatedIncident: (id: string) => void;
  addNotification: (incident: Incident) => void;
  manualAssign: (incidentId: string, operator: string | null) => void;
  forceAutoAssign: () => void;
  consumeToasts: () => ToastItem[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ROBOT_IDS = [
  'RBT-001', 'RBT-002', 'RBT-003', 'RBT-004', 'RBT-005',
  'RBT-006', 'RBT-007', 'RBT-008', 'RBT-009',
];
const LOCATIONS = [
  'Sector 7G', 'Warehouse A', 'Loading Dock B', 'Assembly Line 1',
  'Storage Facility', 'Main Corridor', 'Cold Storage Zone', 'Shipping Bay 3',
];
const ISSUE_TYPES = Object.values(IncidentIssueType);
const SEVERITIES = Object.values(IncidentSeverity);
const ACTIONS = ['reroute', 'pause', 'manual_override', 'escalate'] as const;

export const SIM_OPERATORS = ['Alex Chen', 'Sarah Kim', 'Jordan Patel', 'Darren Watkins Jr.'];
const MAX_PER_OPERATOR = 4;

// Timing (ms)
const PROGRESS_DELAY = () => 4000  + Math.random() * 6000;   // 4–10s after assignment
const RESOLVE_DELAY  = () => 12000 + Math.random() * 18000;  // 12–30s after in_progress
const SPAWN_INTERVAL = 18000;

const DESCRIPTIONS: Record<string, string> = {
  obstacle_detected: 'Unknown object detected at intersection point. Visual sensors unable to classify.',
  system_error: 'Critical system error in motor controller firmware. Error code: 0x4A21.',
  path_blocked: 'Designated path blocked by unscheduled obstruction. Alternate route required.',
  sensor_failure: 'Primary proximity sensor array returning null values. Backup sensors online.',
  battery_critical: 'Battery level at 8%. Robot cannot safely navigate to charging station.',
  communication_lost: 'Telemetry link severed. Last known position cached. Signal relay unavailable.',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getLeastBusyOperator(incidents: Incident[]): string | null {
  const loads: Record<string, number> = {};
  for (const op of SIM_OPERATORS) loads[op] = 0;
  for (const inc of incidents) {
    if (inc.assignedTo && loads[inc.assignedTo] !== undefined) loads[inc.assignedTo]++;
  }
  const available = SIM_OPERATORS.filter(op => loads[op] < MAX_PER_OPERATOR);
  if (!available.length) return null;
  const minLoad = Math.min(...available.map(op => loads[op]));
  const tied = available.filter(op => loads[op] === minLoad);
  return tied[Math.floor(Math.random() * tied.length)];
}

function generateFakeIncident(): Incident {
  const issueType = ISSUE_TYPES[Math.floor(Math.random() * ISSUE_TYPES.length)];
  const id = `SIM-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`;
  return {
    id,
    robotId: ROBOT_IDS[Math.floor(Math.random() * ROBOT_IDS.length)],
    location: LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)],
    issueType,
    severity: SEVERITIES[Math.floor(Math.random() * SEVERITIES.length)],
    status: IncidentStatus.waiting,
    description: DESCRIPTIONS[issueType] || 'Automated alert triggered by onboard diagnostics.',
    timestamp: new Date().toISOString(),
    resolvedAt: null,
    actionTaken: null,
    responseTimeSeconds: null,
    assignedTo: null,  // Always starts unassigned
    sensorData: {
      battery: Math.floor(Math.random() * 100),
      speed: parseFloat((Math.random() * 4).toFixed(1)),
      temperature: 28 + Math.floor(Math.random() * 45),
      obstacleDistance: Math.random() > 0.5 ? parseFloat((Math.random() * 8).toFixed(2)) : null,
      signalStrength: Math.floor(Math.random() * 100),
    },
  };
}

// ─── Context ─────────────────────────────────────────────────────────────────

const SimulatedAlertsContext = createContext<SimulatedAlertsContextType | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────────────

export function SimulatedAlertsProvider({ children }: { children: React.ReactNode }) {
  const [simulatedIncidents, setSimulatedIncidents] = useState<Incident[]>([]);
  const [resolvedSimIncidents, setResolvedSimIncidents] = useState<Incident[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityEvent[]>([]);
  const [toastQueue, setToastQueue] = useState<ToastItem[]>([]);

  const incidentsRef = useRef<Incident[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>[]>>(new Map());

  useEffect(() => { incidentsRef.current = simulatedIncidents; }, [simulatedIncidents]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const pushActivity = useCallback((event: Omit<ActivityEvent, 'id'>) => {
    const e: ActivityEvent = { ...event, id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 5)}` };
    setActivityLog(prev => [e, ...prev].slice(0, 50));
  }, []);

  const pushToast = useCallback((item: Omit<ToastItem, 'id'>) => {
    setToastQueue(prev => [...prev, { ...item, id: `toast-${Date.now()}-${Math.random()}` }]);
  }, []);

  const addNotification = useCallback((incident: Incident) => {
    const notif: Notification = {
      id: `notif-${Date.now()}-${Math.random()}`,
      incident,
      timestamp: new Date().toISOString(),
      read: false,
    };
    setNotifications(prev => [notif, ...prev].slice(0, 20));
  }, []);

  const cancelTimers = useCallback((id: string) => {
    const timers = timersRef.current.get(id);
    if (timers) { timers.forEach(clearTimeout); timersRef.current.delete(id); }
  }, []);

  // ── Lifecycle: in_progress → resolve (starts ONLY after assignment) ────────
  //
  // DESIGN: Unassigned incidents stay in WAITING forever until a human (or the
  // "Auto Assign" button) assigns an operator.  Only then does this function
  // start the countdown that moves the incident through in_progress → resolved.

  const scheduleProgressAndResolve = useCallback((incident: Incident, operator: string) => {
    cancelTimers(incident.id);
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Step 1 – Transition to In Progress (4–10 s after assignment)
    const t1 = setTimeout(() => {
      const current = incidentsRef.current.find(i => i.id === incident.id);
      if (!current?.assignedTo) return; // Operator was removed before timer fired

      setSimulatedIncidents(prev =>
        prev.map(inc => inc.id === incident.id ? { ...inc, status: IncidentStatus.in_progress } : inc)
      );
      pushActivity({
        type: 'in_progress',
        message: `${incident.robotId} now in progress`,
        detail: `Response initiated · ${operator}`,
        time: new Date(),
        severity: incident.severity,
        incidentId: incident.id,
        robotId: incident.robotId,
      });

      // Step 2 – Resolve (12–30 s after in_progress)
      const t2 = setTimeout(() => {
        const action = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
        const resolvedAt = new Date().toISOString();

        setSimulatedIncidents(prev => {
          const inc = prev.find(i => i.id === incident.id);
          if (inc) {
            const responseTimeSeconds = parseFloat(
              ((new Date(resolvedAt).getTime() - new Date(inc.timestamp).getTime()) / 1000).toFixed(1)
            );
            const resolved: Incident = {
              ...inc,
              status: IncidentStatus.resolved,
              actionTaken: action as string,
              resolvedAt,
              responseTimeSeconds,
              assignedTo: inc.assignedTo || operator,
            };
            setResolvedSimIncidents(r => [resolved, ...r].slice(0, 60));
            pushActivity({
              type: 'resolved',
              message: `Resolved by ${inc.assignedTo || operator}`,
              detail: `${inc.robotId} · ${action.replace(/_/g, ' ')} · ${responseTimeSeconds}s`,
              time: new Date(),
              severity: inc.severity,
              incidentId: inc.id,
              robotId: inc.robotId,
            });
            pushToast({
              title: '✓ Incident resolved',
              description: `${inc.robotId} resolved by ${inc.assignedTo || operator} via ${action.replace(/_/g, ' ')}`,
              variant: 'default',
            });
          }
          return prev.filter(i => i.id !== incident.id);
        });
        cancelTimers(incident.id);
      }, RESOLVE_DELAY());
      timers.push(t2);
    }, PROGRESS_DELAY());
    timers.push(t1);

    timersRef.current.set(incident.id, timers);
  }, [cancelTimers, pushActivity, pushToast]);

  // ── Spawn new incidents periodically (always UNASSIGNED) ──────────────────

  useEffect(() => {
    const spawnIncident = () => {
      const newIncident = generateFakeIncident();
      setSimulatedIncidents(prev => [newIncident, ...prev].slice(0, 12));
      addNotification(newIncident);
      pushActivity({
        type: 'created',
        message: `New alert: ${newIncident.robotId}`,
        detail: `${newIncident.issueType.replace(/_/g, ' ')} · ${newIncident.location}`,
        time: new Date(),
        severity: newIncident.severity,
        incidentId: newIncident.id,
        robotId: newIncident.robotId,
      });
      // No automatic assignment — incidents wait for human action
    };

    const initTimer = setTimeout(spawnIncident, 1500);
    const interval = setInterval(spawnIncident, SPAWN_INTERVAL);
    return () => { clearTimeout(initTimer); clearInterval(interval); };
  }, [addNotification, pushActivity]);

  // ── Cleanup timers on unmount ──────────────────────────────────────────────

  useEffect(() => {
    const ref = timersRef.current;
    return () => { ref.forEach(timers => timers.forEach(clearTimeout)); };
  }, []);

  // ── Manual operations ──────────────────────────────────────────────────────

  const removeSimulatedIncident = useCallback((id: string) => {
    cancelTimers(id);
    setSimulatedIncidents(prev => prev.filter(inc => inc.id !== id));
  }, [cancelTimers]);

  const manualAssign = useCallback((incidentId: string, operator: string | null) => {
    const incident = incidentsRef.current.find(i => i.id === incidentId);
    if (!incident) return;

    setSimulatedIncidents(prev =>
      prev.map(inc => {
        if (inc.id !== incidentId) return inc;
        // If clearing assignment and was in_progress, roll back to waiting
        const newStatus = !operator && inc.status === IncidentStatus.in_progress
          ? IncidentStatus.waiting
          : inc.status;
        return { ...inc, assignedTo: operator, status: newStatus };
      })
    );

    if (operator) {
      pushActivity({
        type: 'assigned',
        message: `Assigned to ${operator}`,
        detail: `${incident.robotId} · ${incident.issueType.replace(/_/g, ' ')}`,
        time: new Date(),
        severity: incident.severity,
        incidentId,
        robotId: incident.robotId,
      });
      // Lifecycle begins NOW — only because a human assigned it
      scheduleProgressAndResolve(incident, operator);
    } else {
      // Assignment cleared — cancel any pending timers
      cancelTimers(incidentId);
    }
  }, [pushActivity, scheduleProgressAndResolve, cancelTimers]);

  const forceAutoAssign = useCallback(() => {
    // Build a mutable working copy to track workloads as we assign
    const working = [...incidentsRef.current];
    const unassigned = working.filter(i => !i.assignedTo);
    for (const inc of unassigned) {
      const op = getLeastBusyOperator(working);
      if (!op) break;
      // Update working copy so next iteration sees updated loads
      const idx = working.findIndex(i => i.id === inc.id);
      if (idx !== -1) working[idx] = { ...working[idx], assignedTo: op };
      manualAssign(inc.id, op);
    }
  }, [manualAssign]);

  const consumeToasts = useCallback((): ToastItem[] => {
    const items = toastQueue;
    if (items.length > 0) setToastQueue([]);
    return items;
  }, [toastQueue]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const markOneRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  return (
    <SimulatedAlertsContext.Provider value={{
      simulatedIncidents,
      resolvedSimIncidents,
      notifications,
      activityLog,
      toastQueue,
      unreadCount,
      markAllRead,
      markOneRead,
      removeSimulatedIncident,
      addNotification,
      manualAssign,
      forceAutoAssign,
      consumeToasts,
    }}>
      {children}
    </SimulatedAlertsContext.Provider>
  );
}

export function useSimulatedAlerts() {
  const context = useContext(SimulatedAlertsContext);
  if (!context) throw new Error('useSimulatedAlerts must be used within a SimulatedAlertsProvider');
  return context;
}
