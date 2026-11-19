**HACKATHON PROBLEM STATEMENT**

*Phish4Good — Open-Source Threat-to-Training Platform: Training at the Speed of Attackers*

---

| **Submitted By** | Ganesan, Viruchith — Software Development Consultant I, Lumen Technologies |
| --- | --- |
| **Team** | NextGen Ninjas |
| **Date** | November 19, 2026 |
| **Target Audience** | All employees, grouped into role-based cohorts (e.g., engineering, IT/helpdesk, finance, HR, leadership) |
| **Domain** | Cybersecurity Awareness & Human Risk Mitigation |
| **Hackathon Track** | Security Innovation — Threat Intelligence & Human Risk Mitigation |
# 1. Executive Summary
---

Attackers do not wait for annual security-awareness training. When a major outage, vulnerability, or breach occurs, they rapidly turn it into a convincing phishing pretext. Employees are then asked to act on a believable story about an event they have just read about, while their annual training module is months old.

Phish4Good is an open-source Threat-to-Training platform that converts trusted cyber advisories and real-world events into safe, role-relevant security exercises. It identifies which employee cohorts could plausibly be targeted, generates a grounded simulation, validates it against privacy and safety policies, and requires human approval before anything is delivered.

After each exercise, Phish4Good explains exactly how the pretext worked and teaches employees how to verify similar requests through official channels. The goal is not to create better phishing. It is to help defenders train at the speed of attackers.
# 2. Problem Statement
---

Security-awareness programs run on a calendar. Attacker campaigns run on the news cycle. The gap between the two is where employees get caught.
## 2.1 Attackers Weaponize Events Within Hours
A recent example shows how fast this happens. After the November 12, 2026 Microsoft 365 outage, Mimecast saw phishing emails using the outage as a lure within hours.[3] On November 13, Microsoft Threat Intelligence observed a coordinated, high-volume campaign worldwide. The emails were disguised as Microsoft 365 service-health notifications and claimed that held messages would be deleted within 24 hours unless the recipient clicked a “Restore Messages” button.[1]

The lures were built to look credible and to evade simple filters:

- **Authentic details:** one lure cited EX1550543, a genuine Exchange Online incident identifier tied to the real disruption.[2]

- **Light personalization:** sender display names used an organization-style prefix followed by “Outage Notification” or “Service Health.”[1]

- **Evasion:** randomized subject tokens and recipient-specific tracking links made simple pattern matching harder.[1]

- **Pressure:** a 24-hour deadline and a single call-to-action button left the recipient one path to follow.[3]

Microsoft noted that multiple threat actors may keep looking for notable global events to use as social-engineering pretexts.[1] The same pattern applies to vulnerability disclosures and breaches. A new web-server remote-code-execution flaw, for example, invites fake “urgent patch” messages aimed at the engineers who run those servers.
## 2.2 Annual Training Cannot Keep Pace
- Generic modules are written months in advance and cannot reference an event that happened yesterday.

- The same content goes to everyone, although different cohorts face different pretexts. Platform engineers see “patch now” lures, general staff see “restore your mailbox” lures, and finance sees invoice lures.

- Hand-built simulations take security teams days to research and write, so they arrive after the attacker’s window has closed.

- Employees are rarely taught the habit that matters most: verifying an unexpected request through an official channel rather than the link or number in the message.
## 2.3 Why Automation Alone Is Risky
A tool that simply generates phishing from the news would be dangerous and unreliable. It could hallucinate facts, leak personal data into prompts, or produce content that is too realistic to be safe. Any credible solution must be grounded in trusted sources, constrained by privacy and safety policy, and controlled by a human approver. This is the design constraint Phish4Good is built around.
# 3. Proposed Solution: Phish4Good
---

Phish4Good is an open-source Threat-to-Training platform. It turns a trusted advisory or real-world event into a safe, role-relevant exercise within hours instead of weeks, and keeps a human in control at every release.
## 3.1 How It Works
Each event passes through the same seven-step pipeline:

| **Step**--- | **Stage**--- | **What happens**--- |
| :---: | :---: | :---: |
| 1--- | Ingest--- | Pulls trusted cyber advisories, vendor security bulletins, service-status pages, and breach reports. Each event is stored with its source link.--- |
| 2--- | Identify cohorts--- | Maps the event to the employee cohorts that could plausibly be targeted, using role-level groups (for example platform engineers, IT helpdesk, finance, all staff). No individual profiling.--- |
| 3--- | Generate--- | Drafts a simulation grounded only in the facts of the source advisory, with a citation for every claim and a list of the red flags the exercise contains.--- |
| 4--- | Validate--- | Checks the draft against privacy and safety policies: no personal data, no real brands’ credentials or live malicious links, no unsafe payloads, and no impersonation of named individuals.--- |
| 5--- | Human approval--- | A security reviewer reads the exercise, the source, and the policy results, then approves, edits, or rejects. Nothing is sent without approval.--- |
| 6--- | Deliver--- | Sends the approved exercise to the target cohort through an internal, sandboxed channel. Clicks are recorded; no credentials are ever collected.--- |
| 7--- | Debrief--- | Explains exactly how the pretext worked, shows the red flags, and teaches the employee how to verify a similar request through official channels.--- |
## 3.2 Worked Examples
The examples below show how a single event becomes different exercises for different cohorts. The Microsoft 365 outage example is based on the publicly reported campaign.[1][2] The nginx2root and php2shell entries are illustrative events. Java4Shell and Ruby2Shell are grounded in public researcher advisories.[6][7]

| **Triggering event**--- | **Cohort**--- | **Pretext the exercise models**--- | **How to verify officially**--- |
| :---: | :---: | :---: | :---: |
| Microsoft 365 outage (Nov 2026)--- | All staff using Outlook and Exchange Online--- | Fake “service health” notice saying held messages will be deleted in 24 hours unless a “Restore messages” button is clicked--- | Check the Microsoft 365 admin center or the internal IT status page; never use a restore link in an email--- |
| nginx2root (web-server advisory; example event)--- | Platform engineers, DevOps, SRE--- | Fake vendor-style notice urging an immediate “mitigation” or patch from a link, citing the advisory’s real CVE and product versions--- | Open the vendor’s advisory directly and apply patches through the internal patch-management process--- |
| php2shell (web-application advisory; example event)--- | Application developers, web hosting teams--- | Fake hotfix or “failed security scan” message for a PHP application, urging a package or script download--- | Use the official package source and the internal security team’s ticket queue to confirm the fix--- |
| Java4Shell (OpenJDK Base64 RCE; CVE-2026-114938)--- | Platform engineers; application developers running JVM services--- | Fake urgent OpenJDK / scanner hotfix citing Java4Shell and familiar products (Jira, Jenkins, Keycloak)--- | Confirm via the official advisory and apply OpenJDK/vendor fixed builds through internal patch management--- |
| Ruby2Shell (Ruby encoding heap overflow)--- | Application developers (Rails/Sinatra); platform teams for self-hosted Ruby stacks--- | Fake emergency Ruby upgrade package citing fixed versions 3.3.14 / 3.4.13 / 4.0.10--- | Confirm via the official advisory and upgrade Ruby or vendor bundles through internal change control--- |
## 3.3 Safety and Responsible-Use Guardrails
The goal is not to create better phishing. These controls keep the platform on the defender’s side:

- **Grounded, not invented:** every factual statement in an exercise must trace to a cited advisory. Unsupported claims fail validation.

- **Safe by construction:** exercises use internal, clearly controlled domains and landing pages. No real credential capture, no malware, no external sending.

- **Privacy-preserving:** cohort-level targeting only. Personal data is excluded from prompts, and results are reported in aggregate rather than as individual scorecards.

- **Human in the loop:** an approver signs off on each exercise, and every approval, edit, and rejection is logged for audit.

- **Defender-focused output:** each exercise ships with its red-flag explanation and verification steps. The platform produces training content, not reusable attack kits.

- **Open and reviewable:** the code, policy rules, and templates are open source, so the community can inspect and improve the safety controls.
## 3.4 Hackathon Prototype Scope
The prototype will demonstrate the full pipeline end to end on at least the three events above, with these components:

- **Ingestion service:** scheduled collectors for advisory and status feeds, with source allow-listing and de-duplication.

- **Cohort mapper:** rule-based mapping from affected product or technology to role cohorts (MVP); richer models are future work.

- **Grounded generator:** an approved LLM that receives only the advisory text and cohort description, and returns a scenario with citations and red flags.

- **Policy validator:** deterministic checks for privacy, safety, and grounding, run before any human sees the draft.

- **Approval queue and dashboard:** reviewer console showing source, draft, policy results, and decision history.

- **Exercise and debrief UI:** sandboxed delivery pages and an interactive “how this pretext worked” explanation.

- **Data store:** events, approvals, and aggregate outcomes. The proposed stack is React for the front end, Node.js for services, and PostgreSQL for storage; this may change during the build.
# 4. Expected Impact & Outcomes
---

The successful implementation of Phish4Good is expected to deliver the following outcomes:

| **Outcome**--- | **Description**--- |
| :---: | :---: |
| Faster Time-to-Training--- | An advisory or event becomes an approved exercise in hours rather than weeks, so employees practice against a pretext while it is still circulating.--- |
| Role-Relevant Exercises--- | Each cohort sees the pretext it is most likely to face, such as “patch now” lures for engineers and “restore your mailbox” lures for general staff.--- |
| Verification Habit--- | Employees learn to confirm unexpected requests through official channels instead of the link, button, or phone number in the message.--- |
| Safe and Governed Automation--- | Grounding, policy validation, and mandatory human approval let security teams use automation without releasing unreviewed content.--- |
| Measurable Behavior Change--- | The platform tracks click, report, and verify rates by cohort, in aggregate, to show whether behavior improves after each exercise.--- |
| Community Benefit--- | Because the project is open source, other defenders can reuse the pipeline, policies, and scenario templates.--- |
# 5. Strategic Alignment
---

Phish4Good supports Lumen Technologies’ security-first engineering culture. As an operator of critical network infrastructure, Lumen has employees across engineering, operations, and corporate functions who can all be targeted when a major event makes the news. Event-driven, role-relevant training shortens the time between a new threat and a prepared workforce.

The design also fits the hackathon’s expectations for responsible AI use. The prototype will use only approved models, and any move toward production would go through AI governance review first. Mandatory human approval and policy validation are built into the workflow from the start, and aggregate reporting protects employee privacy.
# 6. Hackathon Delivery Timeline
---

| **Phase**--- | **Duration**--- | **Deliverable**--- |
| :---: | :---: | :---: |
| Phase 1--- | Hours 1–4--- | Architecture, repository setup, and advisory ingestion from trusted sources (vendor advisories, status pages, security research)--- |
| Phase 2--- | Hours 5–12--- | Event-to-cohort mapping, grounded scenario generator, and policy validator (privacy and safety checks)--- |
| Phase 3--- | Hours 13–20--- | Human approval queue, safe exercise delivery, and “how the pretext worked” debrief experience--- |
| Phase 4--- | Hours 21–24--- | End-to-end demo on the Microsoft 365 outage scenario, testing, documentation, and final presentation--- |
# 7. Team & Roles
---

Team: NextGen Ninjas | Lead: Ganesan, Viruchith (Software Development Consultant I)

The team brings full-stack development expertise, with strong foundations in Java/Node.js backend services, React frontend development, and database engineering (Oracle, PostgreSQL). Phish4Good is developed as a free and open-source project (github.com/viruchith/Phish4Good), so the code, templates, and policy rules can be reviewed and reused by other defenders.
# References
---

[[1] High volume phishing campaign uses Microsoft 365 outage lures to target multiple industry sectors — Microsoft Security Blog (Nov 16, 2026)](https://www.microsoft.com/en-us/security/blog/2026/11/16/high-volume-phishing-campaign-uses-microsoft-365-outage-lures-target-multiple-industry-sectors-2/)

[[2] Threat Actors Exploit Microsoft 365 Outage in Credential Phishing Campaign — Fortra (Nov 16, 2026)](https://www.fortra.com/blog/threat-actors-exploit-microsoft-365-outage-credential-phishing-campaign)

[[3] Attackers Exploit the Microsoft 365 Outage with Fake “Held Messages” Lures — Mimecast (Nov 14, 2026)](https://www.mimecast.com/blog/attackers-exploit-the-microsoft-365-outage-with-fake-held-messages-lures/)

[[4] Hackers exploit Microsoft 365 outage to launch credential phishing campaign — Computerworld (Nov 17, 2026)](https://www.computerworld.com/article/4249607/hackers-exploit-microsoft-365-outage-to-launch-credential-phishing-campaign.html)

[[5] Microsoft 365 outage phishing targets credentials — Cybernews (Nov 17, 2026)](https://cybernews.com/news/microsoft-outage-phishing/)

[[6] Java4Shell — Calif](https://calif.io/java4shell)

[[7] Ruby2Shell — Veria Labs](https://verialabs.com/ruby2shell/)


