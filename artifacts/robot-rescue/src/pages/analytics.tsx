import { useGetAnalyticsSummary } from "@workspace/api-client-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import { Activity, Clock, ShieldAlert, CheckCircle2, TrendingUp, AlertTriangle, MapPin, Brain } from "lucide-react";

const SEVERITY_COLORS: Record<string, string> = {
  high: 'hsl(0, 84%, 60%)',
  medium: 'hsl(45, 100%, 50%)',
  low: 'hsl(190, 90%, 50%)',
};
const BAR_COLORS = ['hsl(185, 100%, 50%)', 'hsl(185, 80%, 40%)', 'hsl(185, 60%, 35%)', 'hsl(185, 40%, 30%)', 'hsl(185, 30%, 25%)', 'hsl(185, 20%, 20%)'];

const TOOLTIP_STYLE = {
  contentStyle: {
    backgroundColor: 'hsl(240, 10%, 6%)',
    borderColor: 'hsl(240, 10%, 12%)',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '12px',
  },
  itemStyle: { color: 'hsl(0, 0%, 98%)' },
  cursor: { fill: 'hsl(240, 10%, 12%)' },
};

export default function Analytics() {
  const { data: analytics, isLoading } = useGetAnalyticsSummary();

  if (isLoading || !analytics) {
    return (
      <div className="p-8 flex flex-col gap-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-28 bg-secondary/50 rounded-lg border border-border animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="h-72 bg-secondary/50 rounded-lg border border-border animate-pulse" />)}
        </div>
      </div>
    );
  }

  const severityData = analytics.severityBreakdown.map(item => ({
    name: item.severity.toUpperCase(),
    value: item.count,
    color: SEVERITY_COLORS[item.severity] || '#888',
  }));

  const issueData = analytics.issueBreakdown.map(item => ({
    name: item.issueType.replace(/_/g, ' ').toUpperCase(),
    count: item.count,
  }));

  const locationData = (analytics.locationBreakdown || []).map(item => ({
    name: item.location.length > 20 ? item.location.substring(0, 20) + '…' : item.location,
    fullName: item.location,
    count: item.count,
  }));

  const timeData = (analytics.incidentsPerDay || []).map(item => ({
    day: item.day.substring(5),
    count: item.count,
  }));

  const topLocation = (analytics.locationBreakdown || [])[0]?.location || 'N/A';
  const mostFrequent = analytics.mostFrequentIssueType?.replace(/_/g, ' ') || 'N/A';

  const insightSeverity = analytics.highSeverityPct >= 40
    ? `High-severity incidents comprise ${analytics.highSeverityPct}% of all events — above safe threshold.`
    : `Severity profile is within normal range at ${analytics.highSeverityPct}% high-severity.`;

  const insightLocation = `"${topLocation}" is the highest-incident location. Recommend operational review of that zone.`;
  const insightIssue = `Most frequent issue type: ${mostFrequent}. Consider targeted maintenance or preventative protocol.`;

  return (
    <div className="flex flex-col h-full">
      <header className="h-16 px-6 border-b border-border flex items-center justify-between bg-card/50 backdrop-blur-sm">
        <div>
          <h1 className="text-xl font-bold tracking-tight">System Analytics</h1>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">FLEET PERFORMANCE METRICS</p>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <MetricCard title="Total Incidents" value={analytics.totalIncidents} icon={Activity} trend="+12%" />
          <MetricCard title="Active Alerts" value={analytics.activeIncidents} icon={ShieldAlert} valueClass="text-primary" />
          <MetricCard title="Resolved" value={analytics.resolvedIncidents} icon={CheckCircle2} valueClass="text-emerald-500" />
          <MetricCard title="Avg Resolution" value={`${Math.round(analytics.avgResponseTimeSeconds)}s`} icon={Clock} />
          <MetricCard
            title="High Severity %"
            value={`${analytics.highSeverityPct}%`}
            icon={AlertTriangle}
            valueClass={analytics.highSeverityPct >= 40 ? "text-red-500" : "text-amber-500"}
          />
          <MetricCard
            title="Top Issue"
            value={mostFrequent.split(' ')[0]}
            icon={TrendingUp}
            valueClass="text-primary text-xl"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-card border border-border rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-mono text-muted-foreground uppercase mb-5">Incidents Over Time (7 days)</h3>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 10%, 12%)" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fontFamily: 'monospace', fill: 'hsl(240, 5%, 65%)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fontFamily: 'monospace', fill: 'hsl(240, 5%, 65%)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(185, 100%, 50%)"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(185, 100%, 50%)', r: 3, strokeWidth: 0 }}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-mono text-muted-foreground uppercase mb-5">Severity Distribution</h3>
            <div className="h-36 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={65}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {severityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE.contentStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-2 mt-2">
              {severityData.map(entry => (
                <div key={entry.name} className="flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
                    <span className="text-muted-foreground">{entry.name}</span>
                  </div>
                  <span className="font-bold">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-mono text-muted-foreground uppercase mb-5">Incidents by Issue Type</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={issueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 10%, 12%)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fontFamily: 'monospace', fill: 'hsl(240, 5%, 65%)' }} axisLine={false} tickLine={false} tickFormatter={v => v.split(' ')[0]} />
                  <YAxis tick={{ fontSize: 10, fontFamily: 'monospace', fill: 'hsl(240, 5%, 65%)' }} axisLine={false} tickLine={false} />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Bar dataKey="count" fill="hsl(185, 100%, 50%)" radius={[2, 2, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-mono text-muted-foreground uppercase mb-5 flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Top Problem Locations
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={locationData} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(240, 10%, 12%)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fontFamily: 'monospace', fill: 'hsl(240, 5%, 65%)' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fontFamily: 'monospace', fill: 'hsl(240, 5%, 65%)' }} axisLine={false} tickLine={false} width={100} />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(_val, _name, props) => [props.payload.count, props.payload.fullName]} />
                  {locationData.map((_, i) => null)}
                  <Bar dataKey="count" radius={[0, 2, 2, 0]} maxBarSize={20}>
                    {locationData.map((_, i) => (
                      <Cell key={`loc-${i}`} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-5 shadow-sm">
          <h3 className="text-sm font-mono text-muted-foreground uppercase mb-4 flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" /> AI Fleet Insights
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: AlertTriangle, color: analytics.highSeverityPct >= 40 ? "text-red-500" : "text-amber-500", bg: analytics.highSeverityPct >= 40 ? "bg-red-500/10 border-red-500/20" : "bg-amber-500/10 border-amber-500/20", text: insightSeverity, label: "Severity Alert" },
              { icon: MapPin, color: "text-primary", bg: "bg-primary/10 border-primary/20", text: insightLocation, label: "Location Risk" },
              { icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20", text: insightIssue, label: "Issue Pattern" },
            ].map(({ icon: Icon, color, bg, text, label }) => (
              <div key={label} className={`rounded-lg border p-4 ${bg}`}>
                <div className={`flex items-center gap-2 mb-2 ${color}`}>
                  <Icon className="w-4 h-4" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider">{label}</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, trend, valueClass = "" }: { title: string, value: string | number, icon: any, trend?: string, valueClass?: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 shadow-sm flex flex-col">
      <div className="flex items-center justify-between text-muted-foreground mb-3">
        <span className="text-[10px] font-mono uppercase tracking-wider leading-tight">{title}</span>
        <Icon className="w-3.5 h-3.5 opacity-50" />
      </div>
      <div className="flex items-end justify-between mt-auto">
        <span className={`text-2xl font-bold font-mono ${valueClass}`}>{value}</span>
        {trend && <span className="text-xs text-emerald-500 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded">{trend}</span>}
      </div>
    </div>
  );
}
