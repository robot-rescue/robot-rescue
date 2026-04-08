type IssueType =
  | "obstacle_detected"
  | "system_error"
  | "path_blocked"
  | "sensor_failure"
  | "battery_critical"
  | "communication_lost";
type Severity = "low" | "medium" | "high";
type Status = "waiting" | "in_progress" | "resolved";
type ActionTaken = "reroute" | "pause" | "manual_override" | "escalate";

export interface SensorData {
  battery: number;
  speed: number;
  temperature: number;
  obstacleDistance: number | null;
  signalStrength: number;
}

export interface Incident {
  id: string;
  robotId: string;
  location: string;
  issueType: IssueType;
  severity: Severity;
  status: Status;
  description: string;
  timestamp: string;
  resolvedAt: string | null;
  actionTaken: ActionTaken | null;
  responseTimeSeconds: number | null;
  assignedTo: string | null;
  sensorData: SensorData;
}

export const robotIds = [
  "RX-101", "RX-204", "RX-305", "RX-412", "RX-517",
  "RX-623", "RX-718", "RX-829", "RX-934", "RX-047",
];

export const locations = [
  "Warehouse A, Sector 1", "Warehouse A, Sector 3",
  "Warehouse B, Bay 2", "Warehouse B, Bay 5",
  "Loading Dock 1", "Loading Dock 3",
  "Assembly Line C", "Assembly Line D",
  "Cold Storage Zone", "Shipping Area 2",
];

export const operators = [
  "Chen, L.", "Rivera, M.", "Okafor, T.", "Singh, P.", "Walsh, K.",
];

const issueDescriptions: Record<IssueType, string[]> = {
  obstacle_detected: [
    "Robot detected an unidentified obstacle blocking its path. Lidar scan shows a 0.8m x 0.6m object.",
    "Unknown object detected at intersection point. Visual sensors unable to classify. Manual inspection required.",
  ],
  system_error: [
    "Critical system error in motor controller firmware. Error code: 0x4A21. Robot halted for safety.",
    "Navigation stack crashed unexpectedly. Stack trace logged. Requires restart or manual intervention.",
  ],
  path_blocked: [
    "Designated path is blocked by another unit. Alternative route calculation failed — all corridors occupied.",
    "Path unavailable due to maintenance crew activity in Sector 3. Robot awaiting clearance.",
  ],
  sensor_failure: [
    "Left proximity sensor returning null values. Safety protocols triggered automatic shutdown.",
    "Depth camera feed lost. Operating in reduced-capability mode. Obstacle avoidance compromised.",
  ],
  battery_critical: [
    "Battery level below 8%. Robot cannot safely return to charging station without assistance.",
    "Power cell fault detected. Battery draining at 3x normal rate. Immediate intervention required.",
  ],
  communication_lost: [
    "Radio communication lost for 47 seconds. Robot is operating autonomously in safe-hold mode.",
    "Fleet network timeout. Robot has stopped and is awaiting reconnection or manual override.",
  ],
};

function randFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randBetween(min: number, max: number): number {
  return Math.round((Math.random() * (max - min) + min) * 10) / 10;
}

function makeSensorData(issueType: IssueType): SensorData {
  const base: SensorData = {
    battery: randBetween(10, 95),
    speed: randBetween(0, 1.8),
    temperature: randBetween(28, 72),
    obstacleDistance: null,
    signalStrength: randBetween(60, 100),
  };
  if (issueType === "battery_critical") base.battery = randBetween(2, 10);
  if (issueType === "obstacle_detected") {
    base.speed = 0;
    base.obstacleDistance = randBetween(0.2, 1.5);
  }
  if (issueType === "communication_lost") base.signalStrength = randBetween(0, 20);
  if (issueType === "path_blocked") base.speed = 0;
  return base;
}

let idCounter = 1000;

export function generateIncident(overrides: Partial<Incident> = {}): Incident {
  const issueType =
    overrides.issueType ??
    randFrom<IssueType>([
      "obstacle_detected", "system_error", "path_blocked",
      "sensor_failure", "battery_critical", "communication_lost",
    ]);
  const severity = overrides.severity ?? randFrom<Severity>(["low", "medium", "high"]);
  const robotId = overrides.robotId ?? randFrom(robotIds);
  const location = overrides.location ?? randFrom(locations);
  const descriptions = issueDescriptions[issueType];
  const description = overrides.description ?? randFrom(descriptions);
  const now = new Date();
  const minsAgo = Math.floor(Math.random() * 40);
  const timestamp = overrides.timestamp ?? new Date(now.getTime() - minsAgo * 60000).toISOString();

  return {
    id: String(++idCounter),
    robotId,
    location,
    issueType,
    severity,
    status: "waiting",
    description,
    timestamp,
    resolvedAt: null,
    actionTaken: null,
    responseTimeSeconds: null,
    assignedTo: null,
    sensorData: makeSensorData(issueType),
    ...overrides,
  };
}

const actions: ActionTaken[] = ["reroute", "pause", "manual_override", "escalate"];

export const incidents: Incident[] = [
  generateIncident({ severity: "high", issueType: "system_error" }),
  generateIncident({ severity: "high", issueType: "battery_critical" }),
  generateIncident({ severity: "medium", issueType: "obstacle_detected" }),
  generateIncident({ severity: "medium", issueType: "path_blocked" }),
  generateIncident({ severity: "low", issueType: "sensor_failure" }),
  generateIncident({ severity: "low", issueType: "communication_lost" }),
];

export const resolvedIncidents: Incident[] = (() => {
  const resolved: Incident[] = [];
  const issueTypes: IssueType[] = [
    "obstacle_detected", "system_error", "path_blocked",
    "sensor_failure", "battery_critical", "communication_lost",
  ];
  for (let i = 0; i < 21; i++) {
    const issueType = randFrom<IssueType>(issueTypes);
    const severity = randFrom<Severity>(["low", "medium", "high"]);
    const robotId = randFrom(robotIds);
    const location = randFrom(locations);
    const descriptions = issueDescriptions[issueType];
    const description = randFrom(descriptions);
    const now = new Date();
    const daysAgo = Math.floor(Math.random() * 7);
    const hoursAgo = Math.floor(Math.random() * 24);
    const minsAgo2 = Math.floor(Math.random() * 60);
    const timestamp = new Date(
      now.getTime() - daysAgo * 86400000 - hoursAgo * 3600000 - minsAgo2 * 60000
    ).toISOString();
    const responseTime = randBetween(30, 900);
    const resolvedAt = new Date(
      new Date(timestamp).getTime() + responseTime * 1000
    ).toISOString();

    resolved.push({
      id: String(++idCounter),
      robotId,
      location,
      issueType,
      severity,
      status: "resolved",
      description,
      timestamp,
      resolvedAt,
      actionTaken: randFrom(actions),
      responseTimeSeconds: responseTime,
      assignedTo: Math.random() > 0.4 ? randFrom(operators) : null,
      sensorData: makeSensorData(issueType),
    });
  }
  return resolved.sort(
    (a, b) => new Date(b.resolvedAt!).getTime() - new Date(a.resolvedAt!).getTime()
  );
})();
