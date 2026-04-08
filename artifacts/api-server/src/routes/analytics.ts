import { Router } from "express";
import { incidents, resolvedIncidents, type Incident } from "./store";

const router = Router();

router.get("/analytics/summary", (_req, res) => {
  const allIncidents: Incident[] = [...incidents, ...resolvedIncidents];
  const totalIncidents = allIncidents.length;
  const activeIncidents = incidents.filter((i) => i.status !== "resolved").length;
  const resolvedCount = resolvedIncidents.length;

  const responseTimes = resolvedIncidents
    .map((i) => i.responseTimeSeconds)
    .filter((t): t is number => t !== null);
  const avgResponseTimeSeconds =
    responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0;

  const issueTypeCounts: Record<string, number> = {};
  for (const i of allIncidents) {
    issueTypeCounts[i.issueType] = (issueTypeCounts[i.issueType] || 0) + 1;
  }
  const issueBreakdown = Object.entries(issueTypeCounts).map(
    ([issueType, count]) => ({ issueType, count })
  );
  const mostFrequentIssueType = issueBreakdown.reduce(
    (max, cur) => (cur.count > max.count ? cur : max),
    { issueType: "N/A", count: 0 }
  ).issueType;

  const severityCounts: Record<string, number> = {};
  for (const i of allIncidents) {
    severityCounts[i.severity] = (severityCounts[i.severity] || 0) + 1;
  }
  const severityBreakdown = Object.entries(severityCounts).map(
    ([severity, count]) => ({ severity, count })
  );
  const highSeverityPct =
    totalIncidents > 0
      ? Math.round(((severityCounts["high"] || 0) / totalIncidents) * 100)
      : 0;

  const locationCounts: Record<string, number> = {};
  for (const i of allIncidents) {
    locationCounts[i.location] = (locationCounts[i.location] || 0) + 1;
  }
  const locationBreakdown = Object.entries(locationCounts)
    .map(([location, count]) => ({ location, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const last7Days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    last7Days.push(d.toISOString().split("T")[0]);
  }
  const incidentsPerDay = last7Days.map((day) => ({
    day,
    count: allIncidents.filter((i) => i.timestamp.startsWith(day)).length,
  }));

  const recentActivity = [...allIncidents]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5);

  res.json({
    totalIncidents,
    activeIncidents,
    resolvedIncidents: resolvedCount,
    avgResponseTimeSeconds,
    highSeverityPct,
    mostFrequentIssueType,
    issueBreakdown,
    severityBreakdown,
    locationBreakdown,
    incidentsPerDay,
    recentActivity,
  });
});

export default router;
