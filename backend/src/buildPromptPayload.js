import {
  ALLOWED_ASSET_FIELDS,
  ALLOWED_DEPARTMENT_FIELDS,
  ALLOWED_META_FIELDS,
  ALLOWED_ORG_PERSON_FIELDS,
  ALLOWED_PROJECT_FIELDS,
  ALLOWED_SCENARIO_PROFILE_FIELDS,
  ALLOWED_SUBJECT_FIELDS,
  FIELDS_SENT_TO_MODEL,
  pickAllowed,
} from "./fieldAllowlist.js";
import { sanitizeDeep, wrapUntrustedCmdbBlock } from "./promptSanitize.js";

/**
 * Single prompt-building boundary: allowlist → sanitize → delimited user content.
 */
export function buildPromptPayload(mcpPayload) {
  if (!mcpPayload || mcpPayload.error) {
    return {
      promptPayload: null,
      fieldsSentToModel: FIELDS_SENT_TO_MODEL,
      userContent: null,
      error: mcpPayload?.error ?? "INVALID_PAYLOAD",
    };
  }

  const promptPayload = sanitizeDeep({
    meta: pickAllowed(mcpPayload.meta, ALLOWED_META_FIELDS),
    subject: pickAllowed(mcpPayload.subject, ALLOWED_SUBJECT_FIELDS),
    departments: (mcpPayload.departments ?? []).map((d) =>
      pickAllowed(d, ALLOWED_DEPARTMENT_FIELDS),
    ),
    scenarioProfiles: (mcpPayload.scenarioProfiles ?? []).map((s) =>
      pickAllowed(s, ALLOWED_SCENARIO_PROFILE_FIELDS),
    ),
    activeProjects: (mcpPayload.activeProjects ?? []).map((p) =>
      pickAllowed(p, ALLOWED_PROJECT_FIELDS),
    ),
    linkedAssets: (mcpPayload.linkedAssets ?? []).map((a) =>
      pickAllowed(a, ALLOWED_ASSET_FIELDS),
    ),
    orgContext: {
      reportingChain: (mcpPayload.orgContext?.reportingChain ?? []).map((p) =>
        pickAllowed(p, ALLOWED_ORG_PERSON_FIELDS),
      ),
      executiveSponsor: mcpPayload.orgContext?.executiveSponsor
        ? pickAllowed(mcpPayload.orgContext.executiveSponsor, ALLOWED_ORG_PERSON_FIELDS)
        : null,
      peers: (mcpPayload.orgContext?.peers ?? []).map((p) =>
        pickAllowed(p, ALLOWED_ORG_PERSON_FIELDS),
      ),
    },
    contextualAnchors: Array.isArray(mcpPayload.contextualAnchors)
      ? mcpPayload.contextualAnchors.map((a) => String(a))
      : [],
  });

  return {
    promptPayload,
    fieldsSentToModel: FIELDS_SENT_TO_MODEL,
    userContent: wrapUntrustedCmdbBlock(promptPayload),
  };
}
