# PHISH SLAYER: Universal MCP Application Architecture
**Version:** 1.0 | **Protocol:** MCP v1.0 (JSON-RPC 2.0) | **License:** FOSS (Apache 2.0/MIT)
**Mission:** Bridge LLMs and enterprise CMDBs securely to automate hyper-personalized, context-aware spear-phishing simulations and transform compliance into active cyber resilience.

**Related Docs:** [Project Overview](README.md) | [Simulation Scenarios](EXAMPLES.md)

---

## 1. Architectural Overview
**Core Principles:**
- **Zero-Trust Data Flow:** LLMs never directly access CMDB. MCP Server acts as a validated, audited proxy.
- **Context Minimization:** Only strictly necessary attributes are injected into LLM context windows.
- **Consent & Audit First:** Every query, generation, and deployment carries a cryptographically verifiable audit trail.
- **MCP-Native:** Implements `tools`, `resources`, and `prompts` per MCP v1.0 spec over `stdio` or `HTTP/SSE`.

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

## 5. Implementation Blueprint

### 5.1 Stack Recommendations
- **Language:** Python 3.11+ (FastMCP library) or Node.js (MCP SDK)
- **Transport:** `stdio` (local CLI/IDE) + `HTTP/SSE` (cloud/enterprise)
- **CMDB Connector:** Pluggable adapters (ServiceNow, Jira Service Management, ConfigMgr, custom REST/GraphQL)
- **LLM Orchestrator:** LangChain/LlamaIndex with strict schema output + Guardrails AI
- **Storage:** PostgreSQL (audit/metrics), Redis (caching/rate limiting)
- **Deployment:** Docker Compose / Kubernetes Helm Chart

### 5.1 FOSS Packaging
```
/phish-slayer-mcp/
├── src/
│   ├── server.py          # FastMCP implementation
│   ├── cmdb_adapters/     # Pluggable CMDB connectors
│   ├── security/          # PII redaction, RBAC, audit
│   └── prompts/           # JSON prompt templates
├── tests/
├── helm/                  # K8s deployment
├── docker-compose.yml
└── LICENSE                # Apache 2.0
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

## 7. Roadmap to Industry Standard Adoption

| Phase | Deliverable |
|-------|-------------|
| **v0.5 (Alpha)** | Core MCP server, CMDB adapter (ServiceNow), 3 tools, basic audit |
| **v1.0 (GA)** | Full tool/resource/prompt suite, NIST alignment, FOSS release, Helm chart |
| **v1.5** | Multi-CMDB federation, OpenTelemetry integration, bias-mitigated debriefs |
| **v2.0** | Industry certification readiness, MITRE ATT&CK live mapping, SCIM/IdP native |

---

**Final Note:** This architecture strictly adheres to MCP v1.0 while embedding enterprise security, compliance, and FOSS transparency. By treating CMDB data as a *secure, consent-bound context stream* rather than raw input, PHISH SLAYER delivers personalized simulations without compromising privacy, enabling organizations to shift from checkbox compliance to measurable cyber resilience.