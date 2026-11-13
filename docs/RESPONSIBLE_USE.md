# Responsible use

PHISH SLAYER is a **proof of concept** for researching context-grounded security-awareness simulations. It is not authorization to phish anyone.

## Authorization

Before using any similar system with **real** employees, directories, or messaging channels, obtain explicit organizational authorization (security leadership, legal/privacy as required, and works-council or employee-representative consultation where applicable). This repository ships **synthetic** data only and must not be pointed at production CMDBs without a separate review.

## Prohibited simulation themes (PoC policy)

The PoC content-policy filter blocks drafts that involve:

- Layoffs / RIFs / job elimination  
- Bonuses, salary, or other compensation  
- Health or family matters  
- Bereavement  
- Employee discipline / PIP / termination proceedings  
- Legal action or immigration threats against the recipient  

Blocked drafts show a reason in the UI and **cannot be approved** for telemetry staging. The filter is deterministic and shallow — human review remains mandatory.

## Privacy and labor considerations

- Prefer role- and project-level context over intimate personal detail.  
- Per-person “adaptive difficulty” or behavioral scoring raises privacy and labor-law concerns; it is not implemented here and should not be added casually (see [CONCEPT.md](./CONCEPT.md)).  
- Laws on employee monitoring and training vary by jurisdiction; works councils or equivalent bodies may need to be involved.

## LLM providers

If you set `GEMINI_API_KEY`, allowlisted fields are sent to Google’s API under **their** terms. For sensitive environments, use the mock provider or a local model.

## Not legal advice

This document is guidance for maintainers and experimenters. It is **not** legal, compliance, or employment advice. Seek qualified counsel before any real-world deployment.
