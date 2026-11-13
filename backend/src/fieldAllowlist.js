/**
 * Exact CMDB fields allowed into the LLM prompt.
 * Anything else is dropped at the prompt-building boundary (buildPromptPayload.js).
 */

export const ALLOWED_META_FIELDS = [
  "bridge",
  "mode",
  "companyId",
  "cmdbVersion",
  "viewerInstance",
];

export const ALLOWED_SUBJECT_FIELDS = [
  "employeeId",
  "fullName",
  "role",
  "department",
  "departmentId",
  "employmentType",
  "preferredDeliveryVector",
  "projectIds",
  "roleArchetype",
  "contractEndDate",
  "contractVendor",
];

export const ALLOWED_DEPARTMENT_FIELDS = [
  "departmentId",
  "name",
  "costCenter",
  "primaryLocation",
];

export const ALLOWED_SCENARIO_PROFILE_FIELDS = [
  "profileId",
  "name",
  "summary",
  "attackVector",
];

export const ALLOWED_PROJECT_FIELDS = [
  "projectId",
  "name",
  "status",
  "departmentIds",
  "scenarioProfileIds",
  "ownerEmployeeId",
  "leadDevEmployeeId",
  "description",
  "billingSyntheticIncident",
  "contractorHandoff",
  "cmdbViewerJob",
  "integrationRefs",
  "criticalAssetIds",
];

export const ALLOWED_ASSET_FIELDS = [
  "assetId",
  "projectId",
  "displayName",
  "versionLabel",
  "classification",
  "systemId",
  "pathHint",
];

export const ALLOWED_ORG_PERSON_FIELDS = [
  "employeeId",
  "role",
  "department",
  "departmentId",
  "employmentType",
  "roleArchetype",
  "contractEndDate",
];

/** Flat list for UI / docs — field paths conceptually sent to the model. */
export const FIELDS_SENT_TO_MODEL = [
  ...ALLOWED_META_FIELDS.map((f) => `meta.${f}`),
  ...ALLOWED_SUBJECT_FIELDS.map((f) => `subject.${f}`),
  ...ALLOWED_DEPARTMENT_FIELDS.map((f) => `departments[].${f}`),
  ...ALLOWED_SCENARIO_PROFILE_FIELDS.map((f) => `scenarioProfiles[].${f}`),
  ...ALLOWED_PROJECT_FIELDS.map((f) => `activeProjects[].${f}`),
  ...ALLOWED_ASSET_FIELDS.map((f) => `linkedAssets[].${f}`),
  ...ALLOWED_ORG_PERSON_FIELDS.map((f) => `orgContext.reportingChain[].${f}`),
  ...ALLOWED_ORG_PERSON_FIELDS.map((f) => `orgContext.executiveSponsor.${f}`),
  ...ALLOWED_ORG_PERSON_FIELDS.map((f) => `orgContext.peers[].${f}`),
  "contextualAnchors[]",
];

export function pickAllowed(obj, allowedKeys) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return {};
  const out = {};
  for (const key of allowedKeys) {
    if (Object.prototype.hasOwnProperty.call(obj, key) && obj[key] !== undefined) {
      out[key] = obj[key];
    }
  }
  return out;
}
