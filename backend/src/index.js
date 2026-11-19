import { mergedEnvSources, getEnvDiagnostics, reloadEnvFromDisk } from "./loadEnv.js";
import { logBackendVerbose, logClientEvents, LOG_DIR } from "./fileLogger.js";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { listEmployeeSummaries, findPersonnelById, listPersonnelByCohort } from "./mockCmdb.js";
import { buildMcpContextPayload } from "./mcpBridge.js";
import {
  generateSimulationFromContext,
  generateExerciseFromEvent,
  isGeminiKeyConfigured,
} from "./geminiService.js";
import { checkContentPolicy } from "./contentPolicy.js";
import { FIELDS_SENT_TO_MODEL } from "./fieldAllowlist.js";
import {
  listEvents,
  getEvent,
  ingestEvent,
  getCohort,
  SOURCE_ALLOWLIST,
  seedFromDisk,
} from "./threatIngest.js";
import { mapEventToCohorts, listAllCohorts } from "./cohortMapper.js";
import { validateExercise } from "./exerciseValidator.js";

const telemetryStore = [];
/** @type {object[]} */
const exerciseDraftsStore = [];
/** @type {object[]} */
const approvalLogStore = [];
/** @type {object[]} */
const deliveryStore = [];

seedFromDisk();

const fastify = Fastify({ logger: true });

await fastify.register(cors, {
  origin: true,
});

fastify.addHook("onRequest", async (request) => {
  request._psStart = process.hrtime.bigint();
  logBackendVerbose("http", "request", {
    method: request.method,
    url: request.url,
    ip: request.ip,
    userAgent: request.headers["user-agent"],
  });
});

fastify.addHook("onResponse", async (request, reply) => {
  const start = request._psStart;
  const ms = start !== undefined ? Number(process.hrtime.bigint() - start) / 1e6 : null;
  logBackendVerbose("http", "response", {
    method: request.method,
    url: request.url,
    statusCode: reply.statusCode,
    durationMs: ms !== null ? Math.round(ms * 100) / 100 : null,
  });
});

function newId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

fastify.post("/api/client-log", async (request, reply) => {
  const body = request.body ?? {};
  const events = Array.isArray(body.events) ? body.events : [body];
  const slice = events.slice(0, 80).map((ev) => ({
    level: typeof ev?.level === "string" ? ev.level : "info",
    message: typeof ev?.message === "string" ? ev.message.slice(0, 2000) : "client_event",
    url: typeof ev?.url === "string" ? ev.url.slice(0, 2000) : undefined,
    context:
      ev?.context && typeof ev.context === "object"
        ? JSON.stringify(ev.context).slice(0, 8000)
        : typeof ev?.context === "string"
          ? ev.context.slice(0, 8000)
          : undefined,
    stack: typeof ev?.stack === "string" ? ev.stack.slice(0, 8000) : undefined,
    ts: typeof ev?.ts === "string" ? ev.ts : undefined,
  }));
  logClientEvents(slice);
  logBackendVerbose("client_log", "ingested", { count: slice.length });
  return { ok: true, accepted: slice.length };
});

fastify.get("/api/health", async () => {
  if (!isGeminiKeyConfigured()) {
    reloadEnvFromDisk();
  }
  return {
    ok: true,
    service: "phish4good-backend",
    product: "Phish4Good",
    geminiKeyConfigured: isGeminiKeyConfigured(),
    envSources: mergedEnvSources,
    envDiagnostics: getEnvDiagnostics(),
    verboseLogDir: LOG_DIR,
    eventCount: listEvents().length,
    envFileHint:
      "Set GEMINI_API_KEY or GOOGLE_API_KEY in repo-root `.env` or `backend/.env`, then restart the backend (see backend/src/loadEnv.js).",
  };
});

fastify.get("/api/employees", async () => ({
  employees: listEmployeeSummaries(),
}));

fastify.get("/api/employees/:employeeId/profile", async (request, reply) => {
  const { employeeId } = request.params;
  const raw = findPersonnelById(employeeId);
  if (!raw) {
    return reply.code(404).send({ error: "NOT_FOUND" });
  }
  const projects = buildMcpContextPayload(employeeId);
  if (projects.error) {
    return reply.code(404).send(projects);
  }
  return {
    employee: {
      employeeId: raw.employeeId,
      fullName: raw.fullName,
      role: raw.role,
      department: raw.department,
      employmentType: raw.employmentType,
      preferredDeliveryVector: raw.preferredDeliveryVector,
      projectIds: raw.projectIds,
      emotionalArchetype: raw.emotionalArchetype ?? null,
      primaryTechTheme: raw.primaryTechTheme ?? null,
      simulationHooks: Array.isArray(raw.simulationHooks) ? raw.simulationHooks : [],
      cohortIds: Array.isArray(raw.cohortIds) ? raw.cohortIds : ["COH-ALL-STAFF"],
    },
    activeProjects: projects.activeProjects,
    cloudProviders: projects.activeProjects.map((p) => ({
      projectId: p.projectId,
      aws: p.integrationRefs?.aws ? "linked" : null,
      gcp: p.integrationRefs?.gcp ? "linked" : null,
      datadog: p.integrationRefs?.datadog ? "linked" : null,
      github: p.integrationRefs?.github ? "linked" : null,
      azure: p.integrationRefs?.azure ? "linked" : null,
      okta: p.integrationRefs?.okta ? "linked" : null,
      splunk: p.integrationRefs?.splunk ? "linked" : null,
      jira: p.integrationRefs?.jira ? "linked" : null,
      servicenow: p.integrationRefs?.servicenow ? "linked" : null,
      lacework: p.integrationRefs?.lacework ? "linked" : null,
      argocd: p.integrationRefs?.argocd ? "linked" : null,
    })),
    peers: projects.orgContext.peers,
    linkedAssets: projects.linkedAssets,
    contextualAnchors: projects.contextualAnchors,
  };
});

fastify.get("/api/mcp/context/:employeeId", async (request, reply) => {
  const { employeeId } = request.params;
  const payload = buildMcpContextPayload(employeeId);
  if (payload.error) {
    return reply.code(404).send(payload);
  }
  return payload;
});

// --- Mode A: Threat events / cohorts ---

fastify.get("/api/events", async () => ({
  events: listEvents(),
  sourceAllowlist: SOURCE_ALLOWLIST,
}));

fastify.get("/api/events/:eventId", async (request, reply) => {
  const event = getEvent(request.params.eventId);
  if (!event) return reply.code(404).send({ error: "NOT_FOUND" });
  const mapping = mapEventToCohorts(event);
  return { event, mapping };
});

fastify.get("/api/events/:eventId/cohorts", async (request, reply) => {
  const event = getEvent(request.params.eventId);
  if (!event) return reply.code(404).send({ error: "NOT_FOUND" });
  return mapEventToCohorts(event);
});

fastify.post("/api/events/ingest", async (request, reply) => {
  const result = ingestEvent(request.body ?? {});
  if (!result.ok) {
    const code = result.error === "DUPLICATE" ? 409 : 400;
    return reply.code(code).send(result);
  }
  logBackendVerbose("events", "ingested", { eventId: result.event.eventId });
  return result;
});

fastify.get("/api/cohorts", async () => ({
  cohorts: listAllCohorts(),
}));

// --- Mode A: Exercises / approval ---

fastify.get("/api/exercises", async (request) => {
  const status = request.query?.status;
  let items = exerciseDraftsStore;
  if (status && typeof status === "string") {
    items = items.filter((e) => e.status === status);
  }
  return { items };
});

fastify.get("/api/exercises/:id", async (request, reply) => {
  const row = exerciseDraftsStore.find((e) => e.id === request.params.id);
  if (!row) return reply.code(404).send({ error: "NOT_FOUND" });
  return { exercise: row };
});

fastify.post("/api/exercises/generate", async (request, reply) => {
  const { eventId, cohortId, useGemini = true } = request.body ?? {};
  if (!eventId || !cohortId) {
    return reply.code(400).send({ error: "INVALID_BODY", message: "eventId and cohortId required" });
  }
  const event = getEvent(eventId);
  if (!event) return reply.code(404).send({ error: "NOT_FOUND", message: "Unknown eventId" });
  const cohort = getCohort(cohortId);
  if (!cohort) return reply.code(404).send({ error: "NOT_FOUND", message: "Unknown cohortId" });

  logBackendVerbose("exercise", "generate_start", { eventId, cohortId, useGemini });
  const gen = await generateExerciseFromEvent({
    event,
    cohort,
    useGemini: useGemini !== false,
  });
  const validation = validateExercise(gen.exercise, event);
  const id = newId("EX");
  const row = {
    id,
    eventId,
    cohortId,
    cohortName: cohort.name,
    eventTitle: event.title,
    source: event.source,
    exercise: gen.exercise,
    validation,
    status: "pending",
    generationMeta: {
      source: gen.source,
      reason: gen.reason ?? null,
      model: gen.model ?? null,
      detail: gen.detail ?? null,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  exerciseDraftsStore.unshift(row);
  logBackendVerbose("exercise", "generate_done", {
    id,
    source: gen.source,
    validationAllowed: validation.allowed,
  });
  return {
    exercise: row,
    serverEnv: { geminiKeyConfigured: isGeminiKeyConfigured() },
  };
});

fastify.patch("/api/exercises/:id", async (request, reply) => {
  const row = exerciseDraftsStore.find((e) => e.id === request.params.id);
  if (!row) return reply.code(404).send({ error: "NOT_FOUND" });
  if (row.status !== "pending") {
    return reply.code(409).send({ error: "NOT_EDITABLE", message: "Only pending drafts can be edited" });
  }
  const body = request.body ?? {};
  const next = { ...row.exercise };
  if (typeof body.subject === "string") next.subject = body.subject;
  if (typeof body.pretext_type === "string") next.pretext_type = body.pretext_type;
  if (typeof body.body_html === "string") next.body_html = body.body_html;
  if (Array.isArray(body.citations)) next.citations = body.citations;
  if (Array.isArray(body.redFlags)) next.redFlags = body.redFlags;
  if (typeof body.verifyOfficially === "string") next.verifyOfficially = body.verifyOfficially;

  const event = getEvent(row.eventId);
  const validation = validateExercise(next, event);
  row.exercise = next;
  row.validation = validation;
  row.updatedAt = new Date().toISOString();
  return { exercise: row };
});

fastify.post("/api/exercises/:id/decide", async (request, reply) => {
  const row = exerciseDraftsStore.find((e) => e.id === request.params.id);
  if (!row) return reply.code(404).send({ error: "NOT_FOUND" });
  const { decision, reviewerNote } = request.body ?? {};
  if (decision !== "approve" && decision !== "reject") {
    return reply.code(400).send({ error: "INVALID_BODY", message: "decision must be approve or reject" });
  }
  if (row.status !== "pending") {
    return reply.code(409).send({ error: "ALREADY_DECIDED", message: `Status is ${row.status}` });
  }

  if (decision === "approve") {
    const event = getEvent(row.eventId);
    const validation = validateExercise(row.exercise, event);
    row.validation = validation;
    if (!validation.allowed) {
      return reply.code(422).send({
        error: "VALIDATION_FAILED",
        message: "Exercise must pass policy and grounding checks before approval",
        validation,
      });
    }
  }

  row.status = decision === "approve" ? "approved" : "rejected";
  row.reviewerNote = typeof reviewerNote === "string" ? reviewerNote : "";
  row.decidedAt = new Date().toISOString();
  row.updatedAt = row.decidedAt;

  const logEntry = {
    id: newId("APR"),
    exerciseId: row.id,
    decision: row.status,
    reviewerNote: row.reviewerNote,
    at: row.decidedAt,
    eventId: row.eventId,
    cohortId: row.cohortId,
  };
  approvalLogStore.unshift(logEntry);

  let deliveries = [];
  if (decision === "approve") {
    const members = listPersonnelByCohort(row.cohortId);
    deliveries = members.map((person) => {
      const deliveryId = newId("DLV");
      const item = {
        deliveryId,
        exerciseId: row.id,
        eventId: row.eventId,
        cohortId: row.cohortId,
        employeeId: person.employeeId,
        recipientName: person.fullName,
        department: person.department,
        subject: row.exercise.subject,
        pretext_type: row.exercise.pretext_type,
        body_html: row.exercise.body_html,
        citations: row.exercise.citations,
        redFlags: row.exercise.redFlags,
        verifyOfficially: row.exercise.verifyOfficially,
        eventTitle: row.eventTitle,
        source: row.source,
        deliveredAt: new Date().toISOString(),
        clicked: false,
        reported: false,
        debriefOpened: false,
      };
      deliveryStore.unshift(item);
      return item;
    });
    row.deliveryCount = deliveries.length;
  }

  logBackendVerbose("exercise", "decide", {
    id: row.id,
    decision: row.status,
    deliveryCount: deliveries.length,
  });

  return { ok: true, exercise: row, approval: logEntry, deliveries };
});

fastify.get("/api/approvals", async () => ({
  items: approvalLogStore,
}));

// --- Mode A: Sandbox inbox + metrics ---

fastify.get("/api/inbox", async (request) => {
  let items = deliveryStore;
  const cohortId = request.query?.cohortId;
  const employeeId = request.query?.employeeId;
  if (cohortId) items = items.filter((d) => d.cohortId === cohortId);
  if (employeeId) items = items.filter((d) => d.employeeId === employeeId);
  return {
    items: items.map((d) => ({
      deliveryId: d.deliveryId,
      exerciseId: d.exerciseId,
      eventId: d.eventId,
      cohortId: d.cohortId,
      employeeId: d.employeeId,
      recipientName: d.recipientName,
      department: d.department,
      subject: d.subject,
      eventTitle: d.eventTitle,
      deliveredAt: d.deliveredAt,
      clicked: d.clicked,
      reported: d.reported,
      debriefOpened: d.debriefOpened,
    })),
  };
});

fastify.get("/api/inbox/:deliveryId", async (request, reply) => {
  const item = deliveryStore.find((d) => d.deliveryId === request.params.deliveryId);
  if (!item) return reply.code(404).send({ error: "NOT_FOUND" });
  return { delivery: item };
});

fastify.post("/api/inbox/:deliveryId/click", async (request, reply) => {
  const item = deliveryStore.find((d) => d.deliveryId === request.params.deliveryId);
  if (!item) return reply.code(404).send({ error: "NOT_FOUND" });
  item.clicked = true;
  item.clickedAt = new Date().toISOString();
  logBackendVerbose("inbox", "click", { deliveryId: item.deliveryId });
  return { ok: true, delivery: item };
});

fastify.post("/api/inbox/:deliveryId/report", async (request, reply) => {
  const item = deliveryStore.find((d) => d.deliveryId === request.params.deliveryId);
  if (!item) return reply.code(404).send({ error: "NOT_FOUND" });
  item.reported = true;
  item.reportedAt = new Date().toISOString();
  logBackendVerbose("inbox", "report", { deliveryId: item.deliveryId });
  return { ok: true, delivery: item };
});

fastify.post("/api/inbox/:deliveryId/debrief", async (request, reply) => {
  const item = deliveryStore.find((d) => d.deliveryId === request.params.deliveryId);
  if (!item) return reply.code(404).send({ error: "NOT_FOUND" });
  item.debriefOpened = true;
  item.debriefOpenedAt = new Date().toISOString();
  return { ok: true, delivery: item };
});

fastify.get("/api/metrics", async () => {
  const byCohort = {};
  for (const d of deliveryStore) {
    if (!byCohort[d.cohortId]) {
      byCohort[d.cohortId] = { cohortId: d.cohortId, sent: 0, clicked: 0, reported: 0, verified: 0 };
    }
    const m = byCohort[d.cohortId];
    m.sent += 1;
    if (d.clicked) m.clicked += 1;
    if (d.reported) m.reported += 1;
    if (d.debriefOpened) m.verified += 1;
  }
  return {
    totals: {
      sent: deliveryStore.length,
      clicked: deliveryStore.filter((d) => d.clicked).length,
      reported: deliveryStore.filter((d) => d.reported).length,
      verified: deliveryStore.filter((d) => d.debriefOpened).length,
      pendingExercises: exerciseDraftsStore.filter((e) => e.status === "pending").length,
      approvedExercises: exerciseDraftsStore.filter((e) => e.status === "approved").length,
    },
    byCohort: Object.values(byCohort),
  };
});

// --- Mode B: CASE personalization (existing) ---

fastify.post("/api/simulation/generate", async (request, reply) => {
  const { employeeId, useGemini } = request.body ?? {};
  if (!employeeId || typeof employeeId !== "string") {
    return reply.code(400).send({ error: "INVALID_BODY", message: "employeeId required" });
  }
  logBackendVerbose("simulation", "generate_start", { employeeId, useGemini });
  const mcpPayload = buildMcpContextPayload(employeeId);
  if (mcpPayload.error) {
    logBackendVerbose("simulation", "generate_mcp_error", { employeeId, error: mcpPayload.error });
    return reply.code(404).send(mcpPayload);
  }
  const gen = await generateSimulationFromContext(mcpPayload, {
    useGemini: useGemini !== false,
  });
  const policy = checkContentPolicy(gen.simulation);
  logBackendVerbose("simulation", "generate_done", {
    employeeId,
    source: gen.source,
    reason: gen.reason ?? null,
    model: gen.model ?? null,
    policyAllowed: policy.allowed,
    policyRuleId: policy.ruleId,
  });
  return {
    employeeId,
    mcpContext: mcpPayload,
    simulation: gen.simulation,
    fieldsSentToModel: gen.fieldsSentToModel ?? FIELDS_SENT_TO_MODEL,
    promptPayload: gen.promptPayload ?? null,
    contentPolicy: policy,
    serverEnv: {
      geminiKeyConfigured: isGeminiKeyConfigured(),
    },
    generationMeta: {
      source: gen.source,
      reason: gen.reason ?? null,
      model: gen.model ?? null,
      detail: gen.detail ?? null,
      rawPreview: gen.rawPreview ?? null,
      diagnostics: gen.diagnostics ?? null,
      finishReason: gen.finishReason ?? null,
    },
  };
});

fastify.post("/api/telemetry/stage", async (request, reply) => {
  const body = request.body ?? {};
  const {
    employeeId,
    editedSubject,
    editedPretextType,
    editedBodyHtml,
    deliveryVector,
    contextualAnchors,
  } = body;

  if (!employeeId) {
    return reply.code(400).send({ error: "INVALID_BODY", message: "employeeId required" });
  }

  const person = findPersonnelById(employeeId);
  if (!person) {
    return reply.code(404).send({ error: "NOT_FOUND" });
  }

  const draft = {
    subject: editedSubject ?? body.subject ?? "",
    pretext_type: editedPretextType ?? body.pretext_type ?? "",
    body_html: editedBodyHtml ?? body.body_html ?? "",
  };
  const policy = checkContentPolicy(draft);
  if (!policy.allowed) {
    logBackendVerbose("telemetry", "stage_blocked_policy", {
      employeeId,
      ruleId: policy.ruleId,
      reason: policy.reason,
    });
    return reply.code(422).send({
      error: "CONTENT_POLICY_BLOCKED",
      ruleId: policy.ruleId,
      reason: policy.reason,
      message: policy.reason,
    });
  }

  const id = `TX-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const row = {
    id,
    targetName: person.fullName,
    department: person.department,
    deliveryVector: deliveryVector || person.preferredDeliveryVector || "Email",
    employeeId,
    subject: draft.subject,
    pretext_type: draft.pretext_type,
    body_html: draft.body_html,
    contextualAnchors: Array.isArray(contextualAnchors) ? contextualAnchors : [],
    stagedAt: new Date().toISOString(),
    outcome: "STAGED",
    reportHookSimulated: false,
    linkClickSimulated: false,
  };
  telemetryStore.unshift(row);
  logBackendVerbose("telemetry", "staged", {
    id: row.id,
    employeeId,
    deliveryVector: row.deliveryVector,
  });
  return { ok: true, telemetry: row };
});

fastify.get("/api/telemetry", async () => ({
  items: telemetryStore,
}));

fastify.patch("/api/telemetry/:id/simulate", async (request, reply) => {
  const { id } = request.params;
  const { mode } = request.body ?? {};
  const row = telemetryStore.find((t) => t.id === id);
  if (!row) {
    return reply.code(404).send({ error: "NOT_FOUND" });
  }
  if (mode === "report_hook") {
    row.reportHookSimulated = true;
    row.outcome = "REPORTED";
    row.lastEventAt = new Date().toISOString();
    fastify.log.info({ telemetryId: id, mode }, "simulated_report_hook");
    logBackendVerbose("telemetry", "simulate_report_hook", { id });
  } else if (mode === "link_click") {
    row.linkClickSimulated = true;
    row.outcome = "CLICK_SIMULATED";
    row.lastEventAt = new Date().toISOString();
    fastify.log.info({ telemetryId: id, mode }, "simulated_link_click");
    logBackendVerbose("telemetry", "simulate_link_click", { id });
  } else {
    return reply.code(400).send({ error: "INVALID_MODE", message: "mode must be report_hook or link_click" });
  }
  return { ok: true, telemetry: row };
});

const port = Number(process.env.PORT ?? 8787);
const host = process.env.HOST ?? "0.0.0.0";

try {
  await fastify.listen({ port, host });
  logBackendVerbose("boot", "server_listen", { host, port });
  fastify.log.info(`Phish4Good backend listening on http://${host}:${port}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
