#!/usr/bin/env node
/**
 * Run mock generation over every synthetic CMDB employee and verify grounding.
 * Usage: node scripts/check-grounding.js
 * Exit 0 if all pass; 1 if any fail.
 */
import { listEmployeeSummaries } from "../src/mockCmdb.js";
import { buildMcpContextPayload } from "../src/mcpBridge.js";
import { generateSimulationFromContext } from "../src/geminiService.js";
import { checkGrounding } from "../src/groundingCheck.js";

const employees = listEmployeeSummaries();
let passed = 0;
let failed = 0;
const rows = [];

for (const emp of employees) {
  const mcp = buildMcpContextPayload(emp.employeeId);
  if (mcp.error) {
    failed += 1;
    rows.push({ employeeId: emp.employeeId, ok: false, error: mcp.error });
    continue;
  }
  const gen = await generateSimulationFromContext(mcp, { forceMock: true });
  const result = checkGrounding(gen.simulation, mcp);
  if (result.ok) {
    passed += 1;
  } else {
    failed += 1;
  }
  rows.push({
    employeeId: emp.employeeId,
    name: emp.fullName,
    ok: result.ok,
    found: result.found,
    failures: result.failures,
    subject: gen.simulation.subject,
  });
}

console.log("PHISH SLAYER grounding check (mock provider)\n");
for (const row of rows) {
  const mark = row.ok ? "PASS" : "FAIL";
  console.log(`[${mark}] ${row.employeeId} ${row.name ?? ""}`);
  if (!row.ok) {
    if (row.error) console.log(`  error: ${row.error}`);
    for (const f of row.failures ?? []) {
      console.log(`  - ${f.kind}: ${f.value} (${f.detail})`);
    }
  } else {
    console.log(`  subject: ${row.subject}`);
    console.log(
      `  grounded mentions: projects=${(row.found.projectIds || []).join(",") || "—"} files=${(row.found.fileNames || []).join(",") || "—"} tools=${(row.found.tools || []).join(",") || "—"}`,
    );
  }
}

console.log(`\nSummary: ${passed} passed, ${failed} failed, ${employees.length} total`);
process.exit(failed > 0 ? 1 : 0);
