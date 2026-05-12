These high-fidelity scenarios demonstrate how **PHISH SLAYER** utilizes intelligence and context to simulate advanced spear-phishing and social engineering threats.  

**Related Docs:** [Project Overview](README.md) | [MCP Architecture](MCP_ARCHITECTURE.md)

## 1. Third-Party Integration Scenarios
By querying the CMDB, the system identifies which third-party tools are linked to specific internal projects.  

**Scenario A:** The Cloud Cost Spike (GCP/AWS)
**Context:** Project "CloudLab Orchestrator" is linked to a GCP Billing Account.  

**The Hook:** A fake billing alert referencing the exact Project ID.

**Simulated Email:**

Subject: [CRITICAL] Budget Alert: CloudLab Orchestrator (GCP)

"Hello, our monitoring shows that the CloudLab Orchestrator project has exceeded its daily GCP budget by 300%. Please review the attached cost-usage report for the K3s/Longhorn clusters immediately to prevent service suspension: [Malicious Link]"

**Scenario B:** The DataDog Service Interruption

**Context:** The target is the Lead Developer for the "Atlas Migration" project.  

**The Hook:** A simulated DataDog dashboard failure.

**Simulated Email:**

Subject: DataDog Alert: Service 'Atlas-Main-DB' is Unreachable

"Marcus Thorne, the Atlas-Main-DB is reporting a 100% latency spike. Since you are the listed owner for this migration asset in the CMDB, please authorize the emergency failover by clicking here: [Malicious Link]"

## 2. GitHub/CI-CD Vulnerability Scenarios
The system uses the MCP bridge to reference specific repositories and recent code commits.  

**Scenario C:** The "Leaked Secret" Alert
**Context:** A recent commit was made to the PHISH SLAYER FOSS repository.  

**The Hook:** A security warning about a hardcoded API token.

**Simulated Email:**

Subject: Security Vulnerability found in PHISH-SLAYER/core-logic

"Our automated GitHub scanner detected a potential hardcoded credential in your last commit to the MCP-Connector module. To prevent an unauthorized breach of the CMDB bridge, please review the security advisory and rotate the token here: [Malicious Link]"

## 3. Internal Sabotage & CMDB Access Scenarios
These scenarios simulate a "broken" internal culture or a malicious actor who has already bypassed initial perimeters to view internal metadata.  

**Scenario D:** The "Contractor Handover" Sabotage
**Context:** An internal contract employee is ending their tenure.

**The Hook:** A fake handover request for sensitive admin keys.

**Social Engineering Message (Teams/Slack):**

"Hey, Sarah Jenkins mentioned you're taking over the Titan Upgrade assets since my contract ends Friday. I’ve uploaded the final environment variables and the Schema_v4.pdf master keys to this temporary secure folder. Can you confirm you've received them? [Malicious Link]"  

**Scenario E:** The "CMDB Metadata" Exploit
**Context:** An attacker has gained read-only access to the internal CMDB.  

**The Hook:** Referencing specific, non-public "Linked Asset" details to build trust.  

**Simulated Email:**

Subject: Action Required: Update to Asset ID-992 (PHISH SLAYER)

"Hi, I'm from the ITAM department. We noticed the Asset ID-992 documentation is outdated in the CMDB viewer. Since you are the registered owner, please click here to sync the latest versioning metadata for the Intelligence Engine components: [Malicious Link]"  

Why These Work
- Hyper-Contextual: They use real names, project IDs, and asset IDs pulled directly from the CMDB.  

- Authoritative: They impersonate known "Project Owners" or "Lead Developers".  

- Urgent: They reference real deadlines or technical failures (e.g., GCP budget spikes or 404 errors).