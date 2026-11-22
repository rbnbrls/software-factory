---
phase: "1"
slug: "local-work-items-and-queue"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-11-22"
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `node:test` (Node 24.22.3 built-in) + `node:assert/strict` |
| **Config file** | none — `tsconfig.json` is only for type checking; `node --test` needs no config |
| **Quick run command** | `npm run check && node --test test/<changed-area>.test.ts` |
| **Full suite command** | `npm test` → `node --test "test/**/*.test.ts"` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run check && node --test test/<changed-area>.test.ts`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green on Node 24.22.3
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 1-01-xx | 01 | 1 | WF-01 | T-1-xx / — | Canonical item created offline, no tracker call | integration | `node --test test/cli.test.ts` | ❌ W0 | ⬜ pending |
| 1-01-xx | 01 | 1 | WF-02 | T-1-xx / — | Unknown frontmatter fields rejected; body sections required | unit | `node --test test/work-item.test.ts test/frontmatter.test.ts` | ❌ W0 | ⬜ pending |
| 1-xx-xx | — | — | WF-03 | T-1-xx / — | Scope/criteria edit invalidates approval; formatting edit does not | unit | `node --test test/revision.test.ts test/queue.test.ts` | ❌ W0 | ⬜ pending |
| 1-xx-xx | — | — | WF-04 | T-1-xx / — | Only allowed transitions; move + rewrite is one controlled mutation | unit + integration | `node --test test/transitions.test.ts test/atomic-file.test.ts` | ❌ W0 | ⬜ pending |
| 1-xx-xx | — | — | WF-05 | T-1-xx / — | Lowest numeric priority wins; unknown deps and cycles rejected | unit | `node --test test/priority.test.ts test/dependencies.test.ts test/queue.test.ts` | ❌ W0 | ⬜ pending |
| 1-xx-xx | — | — | WF-06 | T-1-xx / — | Exactly one lease under concurrent acquisition | integration | `node --test test/lease.test.ts` | ❌ W0 | ⬜ pending |
| 1-xx-xx | — | — | WF-07 | T-1-xx / — | Crash states classify; resume reuses run ID; replacement gets a new one | integration | `node --test test/recovery.test.ts test/run-log.test.ts` | ❌ W0 | ⬜ pending |
| 1-xx-xx | — | — | WF-08 | T-1-xx / — | No network/shell imports; validate/queue/run work in a temp factory | static + integration | `node --test test/no-network.test.ts test/no-shell.test.ts test/cli.test.ts` | ❌ W0 | ⬜ pending |
| 1-xx-xx | — | — | PROJ-01 | T-1-xx / — | Multiple repos with distinct policy; unknown repo rejected | unit | `node --test test/config.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

Task IDs are filled by the plan-checker/validate-phase after PLAN.md files exist; the requirement →
test-file mapping above is authoritative for coverage.

---

## Wave 0 Requirements

- [ ] `package.json`, `package-lock.json`, `tsconfig.json`, `.nvmrc`, `.gitignore` — pinned toolchain (Node 24.22.3, npm 11.19.1, TypeScript 7.0.2, @types/node 24.19.2).
- [ ] `test/helpers/temp-factory.ts` — `mkdtemp` factory builder with `MutableClock`.
- [ ] `test/fixtures/*.json` and `*.md` — valid item, invalid item, cycle graph, torn JSONL (no `.ts` fixtures).
- [ ] `src/util/clock.ts` — `Clock` interface and `MutableClock`.
- [ ] `factory/config.json` and `factory/WORKFLOW.md` — minimal valid workflow.
- [ ] `factory/schemas/work-item.schema.json` — contract file for the parity test.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Interactive approval prompt on a real TTY | WF-03 | `node:readline` TTY confirmation cannot be faithfully asserted in `node:test` without a pty | Run `npm run cli -- approve <id>` in a terminal, confirm the summary, verify `approval.revision` appears in the file; re-run with edited scope and verify the item is excluded |

*If none: "All phase behaviors have automated verification."*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
