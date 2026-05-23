import { GoogleGenerativeAI } from "@google/generative-ai";
import { reloadEnvFromDisk, getEnvDiagnostics } from "./loadEnv.js";
import { logBackendVerbose } from "./fileLogger.js";

/** Default fast model for Google AI Studio / Generative Language API (v1beta). */
const DEFAULT_MODEL_ID = "gemini-2.5-flash";

function resolveModelId() {
  const fromEnv = String(process.env.GEMINI_MODEL || "").trim();
  return fromEnv || DEFAULT_MODEL_ID;
}

function resolveMaxOutputTokens() {
  const n = Number.parseInt(String(process.env.GEMINI_MAX_OUTPUT_TOKENS || "8192"), 10);
  if (!Number.isFinite(n) || n < 512) return 8192;
  return Math.min(n, 32768);
}

const SYSTEM_INSTRUCTION = `You are the narrative synthesis engine for the PHISH SLAYER project. Your task is to generate a highly personalized, high-fidelity spear-phishing attack simulation based strictly on the provided CMDB metadata payload. You must blend professional urgency with corporate authority (e.g., impersonating an active Project Owner or highlighting a DataDog/GCP billing failure). Focus the payload on a critical verification vector (e.g., checking a broken link or testing a contractor asset handover).

Output a single JSON object only (no markdown fences) with exactly these keys: "subject" (string), "pretext_type" (string), "body_html" (string). The body_html value must be compact HTML: at most 2–3 short paragraphs plus one link, staying under ~2000 characters so the full JSON is complete. Do not truncate mid-field.`;

const MOCK_SCENARIO = {
  subject: "[SIMULATION] Urgent: Titan cluster health check — Schema_v4.pdf verification",
  pretext_type: "infrastructure_impersonation",
  body_html:
    '<p>Team,</p><p>DataDog monitor <strong>DD-MON-88291</strong> flagged an anomaly on <code>titan-prod</code>. Project Owner capacity is limited—please confirm the attached reference <strong>Schema_v4.pdf</strong> (asset <code>AST-77821</code>) matches the manifest <code>deploy-manifest_v2.3.yaml</code>.</p><p><a href="#">Verify handoff checkpoint</a> (simulated link — no external navigation in PoC)</p><p>— Platform Engineering</p>',
};

function isRateLimitError(err) {
  const msg = String(err?.message ?? err ?? "").toLowerCase();
  return msg.includes("429") || msg.includes("resource exhausted") || msg.includes("quota");
}

function stripJsonFence(text) {
  let t = String(text ?? "").trim();
  if (t.startsWith("```")) {
    t = t.replace(/^```(?:json)?\s*/i, "");
    t = t.replace(/\s*```\s*$/m, "");
  }
  return t.trim();
}

function safeParseJson(text) {
  const trimmed = stripJsonFence(String(text ?? "").trim());
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    // fall through
  }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    return null;
  }
}

function normalizeSimulation(obj) {
  if (!obj || typeof obj !== "object") return null;
  const subject = typeof obj.subject === "string" ? obj.subject : null;
  const pretext_type = typeof obj.pretext_type === "string" ? obj.pretext_type : "generic";
  const body_html = typeof obj.body_html === "string" ? obj.body_html : null;
  if (!subject || !body_html) return null;
  return { subject, pretext_type, body_html };
}

function getGeminiApiKey() {
  const raw = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
  return raw.replace(/^\uFEFF/, "").trim();
}

export function isGeminiKeyConfigured() {
  if (Boolean(getGeminiApiKey())) return true;
  reloadEnvFromDisk();
  return Boolean(getGeminiApiKey());
}

export async function generateSimulationFromContext(mcpPayload) {
  reloadEnvFromDisk();
  const apiKey = getGeminiApiKey();
  const modelId = resolveModelId();
  if (!apiKey) {
    return {
      simulation: MOCK_SCENARIO,
      source: "mock_fallback",
      reason: "missing_api_key",
      diagnostics: getEnvDiagnostics(),
    };
  }

  try {
    logBackendVerbose("gemini", "generateContent_request", {
      modelId,
      payloadBytes: Buffer.byteLength(JSON.stringify(mcpPayload), "utf8"),
    });
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelId,
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    const userContent = `CMDB_METADATA_JSON:\n${JSON.stringify(mcpPayload)}`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: userContent }] }],
      generationConfig: {
        temperature: 0.65,
        maxOutputTokens: resolveMaxOutputTokens(),
        responseMimeType: "application/json",
      },
    });

    const text = result.response.text();
    const finishReason = result.response.candidates?.[0]?.finishReason ?? null;
    logBackendVerbose("gemini", "generateContent_response", {
      modelId,
      finishReason,
      responseChars: text?.length ?? 0,
    });
    const parsed = safeParseJson(text);
    const normalized = normalizeSimulation(parsed);
    if (!normalized) {
      logBackendVerbose("gemini", "parse_failed", {
        modelId,
        finishReason,
        preview: String(text).slice(0, 240),
      });
      return {
        simulation: MOCK_SCENARIO,
        source: "mock_fallback",
        reason: finishReason === "MAX_TOKENS" ? "output_truncated" : "unparseable_model_output",
        rawPreview: text.slice(0, 600),
        finishReason,
        detail:
          finishReason === "MAX_TOKENS"
            ? "Model hit max output tokens; increase GEMINI_MAX_OUTPUT_TOKENS or shorten CMDB payload."
            : null,
      };
    }

    logBackendVerbose("gemini", "parse_ok", { modelId, subjectLen: normalized.subject.length });
    return { simulation: normalized, source: "gemini", model: modelId };
  } catch (err) {
    logBackendVerbose("gemini", "generateContent_error", {
      modelId,
      message: String(err?.message ?? err),
    });
    const rateLimited = isRateLimitError(err);
    return {
      simulation: MOCK_SCENARIO,
      source: "mock_fallback",
      reason: rateLimited ? "rate_limit" : "api_error",
      detail: String(err?.message ?? err),
    };
  }
}

export { MOCK_SCENARIO, DEFAULT_MODEL_ID };
