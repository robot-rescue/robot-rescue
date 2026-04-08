import { Router } from "express";
import {
  ListIncidentsQueryParams,
  CreateIncidentBody,
  UpdateIncidentBody,
} from "@workspace/api-zod";
import { incidents, resolvedIncidents, generateIncident, type Incident } from "./store";

const router = Router();

router.get("/incidents", (req, res) => {
  const query = ListIncidentsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: "Invalid query params" });
    return;
  }
  const { status } = query.data;
  let result: Incident[];
  if (!status || status === "all") {
    result = [...incidents, ...resolvedIncidents];
  } else if (status === "resolved") {
    result = resolvedIncidents;
  } else {
    result = incidents.filter((i) => i.status !== "resolved");
  }
  res.json(result);
});

router.get("/incidents/log", (_req, res) => {
  const log = resolvedIncidents.map((i) => ({
    id: i.id,
    robotId: i.robotId,
    issueType: i.issueType,
    actionTaken: i.actionTaken,
    resolvedAt: i.resolvedAt,
    responseTimeSeconds: i.responseTimeSeconds,
    severity: i.severity,
    location: i.location,
  }));
  res.json(log);
});

router.post("/incidents", (req, res) => {
  const body = CreateIncidentBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const incident = generateIncident({ ...body.data });
  incidents.push(incident);
  res.status(201).json(incident);
});

router.get("/incidents/:id", (req, res) => {
  const { id } = req.params;
  const incident =
    incidents.find((i) => i.id === id) ||
    resolvedIncidents.find((i) => i.id === id);
  if (!incident) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(incident);
});

router.patch("/incidents/:id", (req, res) => {
  const { id } = req.params;
  const body = UpdateIncidentBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }

  const idx = incidents.findIndex((i) => i.id === id);
  if (idx === -1) {
    const ridx = resolvedIncidents.findIndex((i) => i.id === id);
    if (ridx === -1) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const resolved = resolvedIncidents[ridx];
    if (body.data.assignedTo !== undefined) resolved.assignedTo = body.data.assignedTo;
    res.json(resolved);
    return;
  }

  const incident = incidents[idx];
  const { status, actionTaken, assignedTo } = body.data;

  if (assignedTo !== undefined) incident.assignedTo = assignedTo;
  if (status) incident.status = status;
  if (actionTaken) incident.actionTaken = actionTaken;

  if (
    status === "resolved" ||
    (actionTaken !== undefined && incident.status !== "resolved")
  ) {
    incident.status = "resolved";
    incident.resolvedAt = new Date().toISOString();
    const createdMs = new Date(incident.timestamp).getTime();
    incident.responseTimeSeconds = Math.round((Date.now() - createdMs) / 1000);
    if (actionTaken) incident.actionTaken = actionTaken;
    resolvedIncidents.unshift({ ...incident });
    incidents.splice(idx, 1);
  }

  res.json(incident);
});

export default router;
