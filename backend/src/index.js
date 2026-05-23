import { mergedEnvSources, getEnvDiagnostics, reloadEnvFromDisk } from "./loadEnv.js";
import { logBackendVerbose, logClientEvents, LOG_DIR } from "./fileLogger.js";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { listEmployeeSummaries, findPersonnelById } from "./mockCmdb.js";
import { buildMcpContextPayload } from "./mcpBridge.js";
import { generateSimulationFromContext, isGeminiKeyConfigured } from "./geminiService.js";

const telemetryStore = [];

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
    service: "phish-slayer-backend",
    geminiKeyConfigured: isGeminiKeyConfigured(),
    envSources: mergedEnvSources,
    envDiagnostics: getEnvDiagnostics(),
    verboseLogDir: LOG_DIR,
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

fastify.post("/api/simulation/generate", async (request, reply) => {
  const { employeeId } = request.body ?? {};
  if (!employeeId || typeof employeeId !== "string") {
    return reply.code(400).send({ error: "INVALID_BODY", message: "employeeId required" });
  }
  logBackendVerbose("simulation", "generate_start", { employeeId });
  const mcpPayload = buildMcpContextPayload(employeeId);
  if (mcpPayload.error) {
    logBackendVerbose("simulation", "generate_mcp_error", { employeeId, error: mcpPayload.error });
    return reply.code(404).send(mcpPayload);
  }
  const gen = await generateSimulationFromContext(mcpPayload);
  logBackendVerbose("simulation", "generate_done", {
    employeeId,
    source: gen.source,
    reason: gen.reason ?? null,
    model: gen.model ?? null,
  });
  return {
    employeeId,
    mcpContext: mcpPayload,
    simulation: gen.simulation,
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

  const id = `TX-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const row = {
    id,
    targetName: person.fullName,
    department: person.department,
    deliveryVector: deliveryVector || person.preferredDeliveryVector || "Email",
    employeeId,
    subject: editedSubject ?? body.subject ?? "",
    pretext_type: editedPretextType ?? body.pretext_type ?? "",
    body_html: editedBodyHtml ?? body.body_html ?? "",
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
  fastify.log.info(`PHISH SLAYER backend listening on http://${host}:${port}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
