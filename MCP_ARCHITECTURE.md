# PHISH SLAYER: MCP architecture notes (concept + PoC)

**Status:** Design exploration. The running PoC exposes a **mock** context HTTP route (`GET /api/mcp/context/:employeeId`), not a full MCP JSON-RPC server. License for this repository is **GPL-3.0** (see [LICENSE](./LICENSE)); older draft text below that mentioned Apache/MIT referred to a packaging idea only.

**Related Docs:** [README](README.md) | [Concept](docs/CONCEPT.md) | [Examples](EXAMPLES.md) | [Threat model](docs/THREAT_MODEL.md)

---

## Why MCP?

**When MCP adds value:** reusable connectors with a standard `tools` / `resources` / `prompts` interface so multiple clients (IDE agents, automation, this simulator) can share the same CMDB adapter without inventing a one-off API per consumer.

**When a plain internal API is enough:** a single application that only needs one context fetch. The PoC could have used a private function alone; the mock route exists to *shape* the idea of a protocol boundary.

**What this repo implements:** `buildMcpContextPayload` + `GET /api/mcp/context/:id` over the synthetic CMDB. No stdio MCP server, no consent IDs, no real CMDB adapters.

---

## 1. Architectural Overview (vision)

**Core Principles (design goals — mostly Idea only in the PoC):**
- **Zero-Trust Data Flow:** LLMs never directly access CMDB. A bridge acts as a validated proxy. *(PoC: in-process mock.)*
- **Context Minimization:** Only allowlisted attributes reach the prompt. *(PoC: implemented at the prompt-building boundary.)*
- **Consent & Audit First:** Sensitive access should be approved and logged. *(PoC: not enforced — see FAQ in CONCEPT.md.)*
- **MCP-Native (vision):** `tools`, `resources`, and `prompts` over `stdio` or `HTTP/SSE`. *(PoC: mock HTTP only.)*

---

## 2. MCP Primitives Specification

### 2.1 Tools (`tools/call`)
Executable functions the LLM invokes. All inputs are validated against JSON Schema. Outputs are structured, PII-masked, and audit-tagged.

| Tool | Purpose | Critical Constraints |
|------|---------|----------------------|
| `ps_cmdb_query` | Fetch employee/department/asset metadata | Field-level RBAC, consent ID required, max 15 attributes/query |
| `ps_generate_scenario` | Create hyper-personalized phishing template | MITRE ATT&CK aligned, risk-score bounded, LLM prompt-hardened |
| `ps_deploy_simulation` | Dispatch via approved channels | Quarantine mode, opt-out respected, rate-limited |
| `ps_capture_interaction` | Log clicks, submissions, reporting | Hashed identifiers, real-time threat telemetry |
| `ps_analyze_response` | AI-driven behavioral analysis | Bias-mitigated, false-positive filtering |
| `ps_generate_debrief` | Personalized training & feedback | Constructive tone, policy-aligned, skill-gap mapped |
| `ps_audit_compliance` | Verify against NIST/ISO/internal policies | Read-only, immutable log generation |

#### Example: `ps_cmdb_query` Schema
```json
{
  "name": "ps_cmdb_query",
  "description": "Securely query CMDB for contextual attributes used in simulation personalization.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "entity_type": { "type": "string", "enum": ["employee", "department", "role", "asset"] },
      "filters": { "type": "object", "additionalProperties": { "type": ["string", "number", "boolean", "array"] } },
      "attributes": { "type": "array", "items": { "type": "string", "enum": ["title", "department", "tenure", "clearance", "recent_projects", "security_posture", "training_history"] } },
      "consent_id": { "type": "string", "format": "uuid", "description": "Immutable audit reference for data access approval" },
      "max_records": { "type": "integer", "maximum": 50, "default": 1 }
    },
    "required": ["entity_type", "filters", "attributes", "consent_id"]
  }
}
```

#### Example: `ps_generate_scenario` Schema
```json
{
  "name": "ps_generate_scenario",
  "description": "Generate context-aware spear-phishing simulation using CMDB context and threat intelligence.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "target_context": { "type": "object", "description": "Masked CMDB output" },
      "threat_vector": { "type": "string", "enum": ["credential_harvesting", "malware_delivery", "business_email_compromise", "mfa_fatigue", "invoice_fraud"] },
      "difficulty": { "type": "string", "enum": ["awareness", "realistic", "advanced"] },
      "compliance_framework": { "type": "string", "enum": ["NIST-800-50", "ISO-27001", "SOC2", "internal_policy"] },
      "consent_id": { "type": "string", "format": "uuid" }
    },
    "required": ["target_context", "threat_vector", "difficulty", "consent_id"]
  }
}
```

---

### 2.2 Resources (`resources/read`)
Static/dynamic data the LLM can reference. URI-schemed, versioned, and access-controlled.

| Resource URI | Content | Update Cadence |
|--------------|---------|----------------|
| `ps://cmdb/employee/{id}` | Personalized context payload | Real-time (cached 5m) |
| `ps://cmdb/department/{id}/risk_profile` | Departmental threat surface & historical click rates | Daily |
| `ps://policies/training_requirements` | Mandatory modules, frequency, compliance thresholds | Manual versioned |
| `ps://threats/latest_ttps` | MITRE ATT&CK mappings, industry-specific campaigns | Hourly (feeds: CISA, OpenCTI, MISP) |
| `ps://campaign/{id}/metrics` | Live simulation telemetry | Real-time |

**Resource Schema Example:**
```json
{
  "uri": "ps://threats/latest_ttps",
  "mimeType": "application/json",
  "name": "Latest TTPs & Campaign Trends",
  "description": "Curated threat intelligence aligned to enterprise sector.",
  "annotations": { "ttl": 3600, "auth_required": true, "pii_level": "none" }
}
```

---

### 2.3 Prompts (`prompts/get`)
Reusable, parameterized prompt templates that enforce security guardrails, tone, and compliance.

| Prompt URI | Purpose | Arguments |
|------------|---------|-----------|
| `ps://prompts/simulation/generate` | Structure LLM scenario generation | `target_role`, `threat_vector`, `difficulty`, `language` |
| `ps://prompts/debrief/create` | Generate personalized post-simulation feedback | `interaction_type`, `mistake_severity`, `training_gap` |
| `ps://prompts/report/aggregate` | Executive/analyst reporting synthesis | `timeframe`, `department`, `metrics_focus` |

**Prompt Template Structure:**
```json
{
  "name": "ps://prompts/simulation/generate",
  "description": "Generates a secure, context-aware phishing simulation prompt for the LLM.",
  "arguments": [
    { "name": "target_role", "required": true, "type": "string" },
    { "name": "threat_vector", "required": true, "type": "string" },
    { "name": "difficulty", "required": false, "type": "string", "default": "realistic" }
  ],
  "prompt_text": "You are an authorized security simulation engine. Using the provided CMDB context, generate a spear-phishing email targeting a {target_role}. Threat vector: {threat_vector}. Difficulty: {difficulty}. Enforce: realistic tone, no malicious payloads, clear simulation markers in headers, MITRE ATT&CK mapping, and alignment with {compliance_framework}. Output JSON only."
}
```

---

## 3. Security & Compliance Architecture

| Control | Implementation |
|---------|----------------|
| **Data Minimization** | CMDB queries restricted to `attributes` whitelist. PII redacted via regex/LLM guardrails before context injection. |
| **Consent & Audit** | Every tool call requires `consent_id`. Immutable logs stored in append-only ledger (SQLite/PostgreSQL with cryptographic hashes). |
| **RBAC/ABAC** | MCP Server enforces role-based access. CMDB proxy validates against enterprise IdP (OIDC/SAML). |
| **LLM Guardrails** | Prompt injection filtering, output schema validation, toxicity/credential-harvest detection before delivery. |
| **Zero-Trust Transport** | mTLS for internal services. HTTP/SSE over TLS 1.3. Stdio mode for air-gapped deployments. |
| **Rate Limiting & Abuse Prevention** | Per-user/per-department quotas. Circuit breakers on CMDB and LLM endpoints. |
| **Opt-Out & Ethics** | Hardcoded respect for `do_not_simulate` flags. Debriefs are constructive, non-punitive. |

**Error Codes (MCP Standard Extension):**
| Code | Meaning |
|------|---------|
| `-32601` | Method not found |
| `-32602` | Invalid params |
| `-32001` | Consent missing/expired |
| `-32002` | RBAC denied |
| `-32003` | PII leakage blocked |
| `-32004` | CMDB timeout/rate limit |

---

## 4. Standards & Interoperability Alignment

| Standard | Integration Point |
|----------|-------------------|
| **MCP v1.0** | Core protocol, JSON-RPC 2.0, `tools`/`resources`/`prompts` primitives |
| **NIST SP 800-50** | Awareness training lifecycle, metrics, debrief structure |
| **MITRE ATT&CK** | Threat vector mapping (`TA0001 Initial Access`) |
| **CMDBf / OCMDB** | Metadata federation for multi-CMDB environments |
| **OpenTelemetry** | Tracing, metrics, audit logging |
| **ISO 27001/27701** | Consent management, data minimization, privacy by design |
| **OpenAPI 3.1** | REST fallback for legacy integrations (auto-generated from MCP) |

---

## 5. Implementation blueprint

### 5.1 What the PoC uses today
- **Language / runtime:** Node.js (Fastify) — see `/backend`
- **UI:** Preact + Vite + Tailwind — see `/frontend`
- **LLM:** Google Gemini with mock fallback (`backend/src/geminiService.js`)
- **Context:** Synthetic CMDB + mock bridge (`mockCmdb.js`, `mcpBridge.js`)

### 5.2 Possible later (Idea only)
- Real MCP SDK server (Node or Python), `stdio` / `HTTP/SSE`
- Pluggable CMDB adapters (ServiceNow, Jira Service Management, custom REST)
- Other LLM providers or local models
- Persistent audit store, Redis rate limits, container packaging

### 5.3 Example packaging sketch (Idea only — not this repo’s layout)
```
/phish-slayer-mcp/          # hypothetical package
├── src/server.(js|py)
├── cmdb_adapters/
├── security/
└── prompts/
```

---

## 6. Example Execution Flow (JSON-RPC)

1. **Client requests tool list:**
   ```json
   {"jsonrpc":"2.0","id":1,"method":"tools/list"}
   ```

2. **LLM calls `ps_cmdb_query`:**
   ```json
   {"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"ps_cmdb_query","arguments":{"entity_type":"employee","filters":{"department":"Finance","role_contains":"Analyst"},"attributes":["title","department","recent_projects","security_posture"],"consent_id":"a1b2c3d4-e5f6-7890-abcd-ef1234567890"}}}
   ```

3. **Server returns masked context:**
   ```json
   {"jsonrpc":"2.0","id":2,"result":{"content":[{"type":"text","text":"{\"title\":\"Senior Financial Analyst\",\"department\":\"Finance\",\"recent_projects\":\"Q3 Audit, Vendor Onboarding\",\"security_posture\":\"Compliant\",\"training_history\":\"Last completed: 4 months ago\"}"}],"isError":false,"audit_hash":"sha256:...","consent_verified":true}}
   ```

4. **LLM calls `ps_generate_scenario` → `ps_deploy_simulation` → `ps_capture_interaction` → `ps_generate_debrief`**

---

## 7. If this were taken further (no dates)

- Stand up a real MCP server that wraps the allowlisted context builder  
- One production CMDB adapter behind read-only credentials  
- Wire generation into an existing simulation platform’s draft API (not a full dispatch stack here)  
- Formal evaluation of grounding + policy gates (see [HYPOTHESES.md](docs/HYPOTHESES.md))  

---

**Final note:** Treat sections 2–4 and the JSON-RPC examples as a **vision** for how an MCP-native design *could* look. The honest runtime picture is: synthetic CMDB → mock context route → allowlisted prompt → LLM/mock → policy → human review → in-memory telemetry.