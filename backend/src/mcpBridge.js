import { mockCmdb, findPersonnelById, findDepartmentById } from "./mockCmdb.js";

const PII_FIELDS = new Set([
  "workEmail",
  "directPhone",
  "nationalIdMasked",
  "homeCity",
]);

function stripPii(person) {
  const out = { ...person };
  for (const key of PII_FIELDS) {
    delete out[key];
  }
  return out;
}

function resolveProjectsForPerson(person) {
  if (!person) return [];
  return mockCmdb.projects.filter((prj) => person.projectIds.includes(prj.projectId));
}

function resolveAssetsForProjects(projectIds) {
  return mockCmdb.assets.filter((a) => projectIds.includes(a.projectId));
}

function resolvePeers(peerIds) {
  return (peerIds ?? [])
    .map((id) => findPersonnelById(id))
    .filter(Boolean)
    .map((p) => ({
      employeeId: p.employeeId,
      role: p.role,
      department: p.department,
      departmentId: p.departmentId,
      employmentType: p.employmentType,
      roleArchetype: p.roleArchetype ?? null,
      contractEndDate: p.contractEndDate ?? null,
    }));
}

function resolveReportingChain(person) {
  const chain = [];
  let current = person;
  const guard = new Set();
  while (current?.reportsToEmployeeId && !guard.has(current.reportsToEmployeeId)) {
    guard.add(current.reportsToEmployeeId);
    const mgr = findPersonnelById(current.reportsToEmployeeId);
    if (!mgr) break;
    chain.push({
      employeeId: mgr.employeeId,
      role: mgr.role,
      department: mgr.department,
      departmentId: mgr.departmentId,
      employmentType: mgr.employmentType,
      roleArchetype: mgr.roleArchetype ?? null,
    });
    current = mgr;
  }
  return chain;
}

function resolveSponsor(person) {
  if (!person?.sponsorEmployeeId) return null;
  const s = findPersonnelById(person.sponsorEmployeeId);
  if (!s) return null;
  return {
    employeeId: s.employeeId,
    role: s.role,
    department: s.department,
    departmentId: s.departmentId,
    employmentType: s.employmentType,
    roleArchetype: s.roleArchetype ?? null,
  };
}

function resolveDepartmentsForPerson(person, projects) {
  const ids = new Set();
  if (person?.departmentId) ids.add(person.departmentId);
  for (const prj of projects) {
    for (const did of prj.departmentIds ?? []) ids.add(did);
  }
  return [...ids].map((id) => findDepartmentById(id)).filter(Boolean);
}

function resolveScenarioProfilesForProjects(projects) {
  const seen = new Set();
  const out = [];
  for (const prj of projects) {
    for (const pid of prj.scenarioProfileIds ?? []) {
      if (seen.has(pid)) continue;
      seen.add(pid);
      const def = mockCmdb.scenarioProfiles.find((s) => s.profileId === pid);
      if (def) out.push(def);
    }
  }
  return out;
}

function pushIntegrationAnchors(prj, contextualAnchors) {
  const ir = prj.integrationRefs;
  if (!ir) return;

  if (prj.billingSyntheticIncident) {
    const b = prj.billingSyntheticIncident;
    contextualAnchors.push(
      `scenario:billing_spike:${b.spikePctVs7dAvg}pct:${b.primaryResourceLabel}`,
    );
  }
  if (prj.contractorHandoff) {
    const h = prj.contractorHandoff;
    contextualAnchors.push(
      `scenario:contractor_offboard:${h.primaryContractorEmployeeId}:end:${h.contractEndDate}:peer:${h.peerRecipientEmployeeId}`,
    );
    contextualAnchors.push(`hris:case:${h.hrisCaseId}`);
  }
  if (prj.cmdbViewerJob) {
    const j = prj.cmdbViewerJob;
    contextualAnchors.push(`cmdb:job:${j.jobName}`);
    contextualAnchors.push(`cmdb:last_run:${j.lastRunId}`);
    contextualAnchors.push(`cmdb:scope:${j.reconciliationScope}`);
  }

  if (ir.gcp) {
    const g = ir.gcp;
    if (g.gcp_billing_account_id) contextualAnchors.push(`gcp:billing:${g.gcp_billing_account_id}`);
    if (g.billingAccountId) contextualAnchors.push(`gcp:billing:${g.billingAccountId}`);
    if (g.projectId) contextualAnchors.push(`gcp:project:${g.projectId}`);
    if (g.projectNumber) contextualAnchors.push(`gcp:project_number:${g.projectNumber}`);
    if (g.computeInstanceName) contextualAnchors.push(`gcp:instance:${g.computeInstanceName}`);
    if (g.region) contextualAnchors.push(`gcp:region:${g.region}`);
    if (g.bigqueryDataset) contextualAnchors.push(`gcp:bq_dataset:${g.bigqueryDataset}`);
  }
  if (ir.aws) {
    const a = ir.aws;
    if (a.clusterArn) contextualAnchors.push(`aws:cluster:${a.clusterArn}`);
    if (a.aws_s3_bucket) contextualAnchors.push(`aws:s3:${a.aws_s3_bucket}`);
    if (a.dynamodbTable) contextualAnchors.push(`aws:dynamodb:${a.dynamodbTable}`);
    if (a.ec2AutoScalingGroup) contextualAnchors.push(`aws:asg:${a.ec2AutoScalingGroup}`);
    if (a.region) contextualAnchors.push(`aws:region:${a.region}`);
    if (a.costAllocationTag) contextualAnchors.push(`aws:cost_tag:${a.costAllocationTag}`);
  }
  if (ir.datadog) {
    const d = ir.datadog;
    if (d.monitorIds?.length) contextualAnchors.push(`datadog:monitors:${d.monitorIds.join(",")}`);
    if (d.primaryMonitorHumanName) contextualAnchors.push(`datadog:monitor_name:${d.primaryMonitorHumanName}`);
    if (d.metricNamespace) contextualAnchors.push(`datadog:metric_ns:${d.metricNamespace}`);
    if (d.dashboardId) contextualAnchors.push(`datadog:dashboard:${d.dashboardId}`);
    if (d.dashboardSlug) contextualAnchors.push(`datadog:dashboard_slug:${d.dashboardSlug}`);
  }
  if (ir.github) {
    const gh = ir.github;
    if (gh.org && gh.repo) {
      contextualAnchors.push(`github:${gh.org}/${gh.repo}`);
      if (gh.defaultBranch) contextualAnchors.push(`github:branch:${gh.org}/${gh.repo}:${gh.defaultBranch}`);
      if (gh.lastCommitSha) contextualAnchors.push(`github:commit:${gh.lastCommitSha}`);
    }
  }
  if (ir.cicdExposureMap) {
    const c = ir.cicdExposureMap;
    if (c.workflowPath) contextualAnchors.push(`cicd:workflow:${c.workflowPath}`);
    if (c.reusableWorkflowPath) contextualAnchors.push(`cicd:reusable_workflow:${c.reusableWorkflowPath}`);
    if (c.modulePaths?.length) {
      for (const mp of c.modulePaths) contextualAnchors.push(`cicd:module:${mp}`);
    }
    if (c.artifactRegistry) contextualAnchors.push(`cicd:registry:${c.artifactRegistry}`);
  }
  if (ir.azure?.tenantId) contextualAnchors.push(`azure:tenant:${ir.azure.tenantId}`);
  if (ir.azure?.subscriptionId) contextualAnchors.push(`azure:subscription:${ir.azure.subscriptionId}`);
  if (ir.azure?.clusterName) contextualAnchors.push(`azure:aks:${ir.azure.clusterName}`);
  if (ir.azure?.appRegId) contextualAnchors.push(`azure:app:${ir.azure.appRegId}`);
  if (ir.okta?.orgUrl) contextualAnchors.push(`okta:org:${ir.okta.orgUrl}`);
  if (ir.okta?.policyId) contextualAnchors.push(`okta:policy:${ir.okta.policyId}`);
  if (ir.okta?.appId) contextualAnchors.push(`okta:app:${ir.okta.appId}`);
  if (ir.splunk?.searchHead) contextualAnchors.push(`splunk:sh:${ir.splunk.searchHead}`);
  if (ir.splunk?.index) contextualAnchors.push(`splunk:index:${ir.splunk.index}`);
  if (ir.splunk?.alertName) contextualAnchors.push(`splunk:alert:${ir.splunk.alertName}`);
  if (ir.splunk?.savedSearchName) contextualAnchors.push(`splunk:savedsearch:${ir.splunk.savedSearchName}`);
  if (ir.jira?.projectKey) contextualAnchors.push(`jira:project:${ir.jira.projectKey}`);
  if (ir.jira?.epicKey) contextualAnchors.push(`jira:epic:${ir.jira.epicKey}`);
  if (ir.servicenow?.instance) contextualAnchors.push(`servicenow:${ir.servicenow.instance}`);
  if (ir.servicenow?.changeTemplate) contextualAnchors.push(`servicenow:chg:${ir.servicenow.changeTemplate}`);
  if (ir.lacework?.account) contextualAnchors.push(`lacework:acct:${ir.lacework.account}`);
  if (ir.lacework?.complianceReport) contextualAnchors.push(`lacework:report:${ir.lacework.complianceReport}`);
  if (ir.argocd?.appName) contextualAnchors.push(`argocd:app:${ir.argocd.appName}`);
  if (ir.argocd?.revision) contextualAnchors.push(`argocd:rev:${ir.argocd.revision}`);
}

/**
 * Simulated MCP read-only context: consolidated professional dependencies
 * with PII removed for LLM-safe payloads.
 */
export function buildMcpContextPayload(employeeId) {
  const raw = findPersonnelById(employeeId);
  if (!raw) {
    return { error: "NOT_FOUND", message: "Unknown employeeId" };
  }

  const subject = stripPii(raw);
  const projects = resolveProjectsForPerson(raw);
  const assets = resolveAssetsForProjects(projects.map((p) => p.projectId));
  const departments = resolveDepartmentsForPerson(raw, projects);
  const scenarioProfiles = resolveScenarioProfilesForProjects(projects);

  const contextualAnchors = [];
  contextualAnchors.push(`company:${mockCmdb.company.id}`);
  contextualAnchors.push(`cmdb:viewer:${mockCmdb.company.viewerInstance}`);
  for (const prj of projects) {
    contextualAnchors.push(`project:${prj.projectId}:${prj.name}`);
    for (const sp of prj.scenarioProfileIds ?? []) {
      contextualAnchors.push(`scenario_profile:${sp}`);
    }
    pushIntegrationAnchors(prj, contextualAnchors);
  }
  for (const a of assets) {
    contextualAnchors.push(`asset:${a.assetId}:${a.displayName}:${a.versionLabel}`);
    if (a.systemId) contextualAnchors.push(`system_id:${a.systemId}`);
    if (a.pathHint) contextualAnchors.push(`path_hint:${a.pathHint}`);
  }

  return {
    meta: {
      bridge: "phish-slayer-mcp-mock",
      mode: "read_only",
      generatedAt: new Date().toISOString(),
      companyId: mockCmdb.company.id,
      cmdbVersion: mockCmdb.company.cmdbVersion,
      viewerInstance: mockCmdb.company.viewerInstance,
    },
    subject,
    departments: departments.map((d) => ({
      departmentId: d.departmentId,
      name: d.name,
      costCenter: d.costCenter,
      primaryLocation: d.primaryLocation,
    })),
    scenarioProfiles,
    activeProjects: projects.map((p) => ({
      projectId: p.projectId,
      name: p.name,
      status: p.status,
      departmentIds: p.departmentIds ?? [],
      scenarioProfileIds: p.scenarioProfileIds ?? [],
      ownerEmployeeId: p.ownerEmployeeId,
      leadDevEmployeeId: p.leadDevEmployeeId,
      description: p.description,
      billingSyntheticIncident: p.billingSyntheticIncident ?? null,
      contractorHandoff: p.contractorHandoff ?? null,
      cmdbViewerJob: p.cmdbViewerJob ?? null,
      integrationRefs: p.integrationRefs,
      criticalAssetIds: p.criticalAssets,
    })),
    linkedAssets: assets.map((a) => ({
      assetId: a.assetId,
      projectId: a.projectId,
      displayName: a.displayName,
      versionLabel: a.versionLabel,
      classification: a.classification,
      systemId: a.systemId ?? null,
      pathHint: a.pathHint ?? null,
    })),
    orgContext: {
      reportingChain: resolveReportingChain(raw),
      executiveSponsor: resolveSponsor(raw),
      peers: resolvePeers(raw.peerEmployeeIds),
    },
    contextualAnchors,
  };
}
