import { findPersonnelById, mockCmdb } from "./mockCmdb.js";

const PROJECT_ID_RE = /\bPRJ-[A-Z0-9-]+\b/g;
const ASSET_ID_RE = /\bAST-[A-Z0-9-]+\b/g;
const FILE_NAME_RE =
  /\b[A-Za-z0-9][A-Za-z0-9._-]{2,}\.(?:pdf|ya?ml|json|md|xlsx|csv|ts|js|tf|dwg|ndjson)\b/gi;

const TOOL_VOCAB = [
  "DataDog",
  "Datadog",
  "GCP",
  "Google Cloud",
  "AWS",
  "GitHub",
  "Azure",
  "Okta",
  "Splunk",
  "Jira",
  "ServiceNow",
  "Lacework",
  "Argo CD",
  "ArgoCD",
  "Teams",
  "Slack",
];

function unique(arr) {
  return [...new Set(arr.filter(Boolean))];
}

export function collectSourceVocabulary(mcpPayload) {
  const projectIds = new Set();
  const assetIds = new Set();
  const fileNames = new Set();
  const personNames = new Set();
  const tools = new Set();

  const subject = mcpPayload?.subject;
  if (subject?.fullName) personNames.add(subject.fullName);

  for (const p of mcpPayload?.orgContext?.peers ?? []) {
    const full = findPersonnelById(p.employeeId);
    if (full?.fullName) personNames.add(full.fullName);
  }
  for (const p of mcpPayload?.orgContext?.reportingChain ?? []) {
    const full = findPersonnelById(p.employeeId);
    if (full?.fullName) personNames.add(full.fullName);
  }
  if (mcpPayload?.orgContext?.executiveSponsor?.employeeId) {
    const full = findPersonnelById(mcpPayload.orgContext.executiveSponsor.employeeId);
    if (full?.fullName) personNames.add(full.fullName);
  }

  for (const prj of mcpPayload?.activeProjects ?? []) {
    if (prj.projectId) projectIds.add(prj.projectId);
    if (prj.ownerEmployeeId) {
      const o = findPersonnelById(prj.ownerEmployeeId);
      if (o?.fullName) personNames.add(o.fullName);
    }
    if (prj.leadDevEmployeeId) {
      const l = findPersonnelById(prj.leadDevEmployeeId);
      if (l?.fullName) personNames.add(l.fullName);
    }
    const ir = prj.integrationRefs ?? {};
    if (ir.datadog) {
      tools.add("DataDog");
      tools.add("Datadog");
    }
    if (ir.gcp) {
      tools.add("GCP");
      tools.add("Google Cloud");
    }
    if (ir.aws) tools.add("AWS");
    if (ir.github) tools.add("GitHub");
    if (ir.azure) tools.add("Azure");
    if (ir.okta) tools.add("Okta");
    if (ir.splunk) tools.add("Splunk");
    if (ir.jira) tools.add("Jira");
    if (ir.servicenow) tools.add("ServiceNow");
    if (ir.lacework) tools.add("Lacework");
    if (ir.argocd) {
      tools.add("Argo CD");
      tools.add("ArgoCD");
    }
  }

  const vector = subject?.preferredDeliveryVector;
  if (vector === "Slack") tools.add("Slack");
  if (vector === "Teams") tools.add("Teams");

  for (const a of mcpPayload?.linkedAssets ?? []) {
    if (a.assetId) assetIds.add(a.assetId);
    if (a.displayName) fileNames.add(a.displayName);
  }

  return { projectIds, assetIds, fileNames, personNames, tools };
}

function extractFromDraft(text) {
  const projectIds = unique(text.match(PROJECT_ID_RE) ?? []);
  const assetIds = unique(text.match(ASSET_ID_RE) ?? []);
  const fileNames = unique(text.match(FILE_NAME_RE) ?? []);
  const tools = TOOL_VOCAB.filter((t) => text.toLowerCase().includes(t.toLowerCase()));
  return { projectIds, assetIds, fileNames, tools };
}

function extractPersonNamesInDraft(text, candidateNames) {
  const found = [];
  for (const name of candidateNames) {
    if (name && text.includes(name)) found.push(name);
  }
  return found;
}

/**
 * Verify project IDs, file names, tools, and person names mentioned in a draft
 * exist in the source MCP/CMDB payload for that employee.
 */
export function checkGrounding(simulation, mcpPayload) {
  const text = [
    String(simulation?.subject ?? ""),
    String(simulation?.pretext_type ?? ""),
    String(simulation?.body_html ?? ""),
  ].join("\n");

  const source = collectSourceVocabulary(mcpPayload);
  const extracted = extractFromDraft(text);
  const allRosterNames = mockCmdb.personnel.map((p) => p.fullName);
  const namesInDraft = extractPersonNamesInDraft(text, allRosterNames);

  const failures = [];

  for (const id of extracted.projectIds) {
    if (!source.projectIds.has(id)) {
      failures.push({ kind: "projectId", value: id, detail: "not in source record projects" });
    }
  }
  for (const id of extracted.assetIds) {
    if (!source.assetIds.has(id)) {
      failures.push({ kind: "assetId", value: id, detail: "not in source record assets" });
    }
  }
  for (const file of extracted.fileNames) {
    const ok = [...source.fileNames].some((f) => f.toLowerCase() === file.toLowerCase());
    if (!ok) {
      failures.push({ kind: "fileName", value: file, detail: "not in source record assets" });
    }
  }
  for (const tool of extracted.tools) {
    const ok = [...source.tools].some((t) => t.toLowerCase() === tool.toLowerCase());
    if (!ok) {
      failures.push({ kind: "tool", value: tool, detail: "tool not linked on source projects/vector" });
    }
  }
  for (const name of namesInDraft) {
    if (!source.personNames.has(name)) {
      failures.push({
        kind: "personName",
        value: name,
        detail: "person not subject/peer/manager/owner in source record",
      });
    }
  }

  return {
    ok: failures.length === 0,
    failures,
    found: {
      projectIds: extracted.projectIds,
      assetIds: extracted.assetIds,
      fileNames: extracted.fileNames,
      tools: extracted.tools,
      personNames: namesInDraft,
    },
  };
}
