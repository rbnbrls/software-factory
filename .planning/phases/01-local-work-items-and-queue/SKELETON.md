# Walking Skeleton — Software Factory

**Phase:** 1
**Generated:** 2026-11-22
**Mode:** MVP / WALKING_SKELETON

## Capability Proven End-to-End

> The operator creates a work item in local Markdown, validates it, approves its exact revision, sees the queue select it, and runs it once — leaving an append-only run receipt and a *pending human-acceptance decision* — with no network, no tracker, and no provider.

This is the smallest capability that exercises every tier Phase 1 will ever have: pure domain (parse → validate → revision → queue), filesystem state (atomic write, rename, append-only log), an adapter boundary (runner), a CLI contract (JSON envelope + exit codes), and a human decision gate (acceptance). No UI tier exists in this project; the "interface" is the CLI and the canonical Markdown tree.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Runtime | Node.js `24.22.3`, native type stripping | Pinned by the project plan (C7). Runs `.ts` directly; no build step, no transform dependency. |
| Language | TypeScript `7.0.2`, `tsc --noEmit` only | Type checking is a gate, not a build. `erasableSyntaxOnly` keeps the source runnable by Node. |
| Dependencies | Zero runtime dependencies | C2 (free/self-hosted) and C4 (no execution surface). Only devDependencies: `typescript`, `@types/node`. |
| Data layer | Local filesystem only — no database | C3: versioned Markdown is the source of truth. Work items are one file each; runs are append-only JSONL. |
| Work-item format | JSON object between `---` delimiters + Markdown body sections (`## Problem`, `## Scope`, `## Out of Scope`, `## Acceptance Criteria`) | D-01 requires hand-editable Markdown. JSON avoids YAML implicit typing without a parser dependency. |
| Approval | Hash bound to the approved specification (`approval.revision`, `sf-revision-v1`) — never a boolean | WF-03 / D-04. A stored boolean survives scope edits; a recomputed hash cannot. |
| Human acceptance | Separate operator command (`factory accept` / `factory reject`) recording a decision in the item, the run directory, and an item decision log | D-13 and project plan §11: checks, agent review, and human acceptance are three distinct recorded steps. The runner can never assert `done`. |
| State mutation | `open('wx')` temp → write → `fsync` → `rename` → `fsync(dir)`; status move = `rename` then rewrite | Design 3. `rename` is atomic per name; the two-step move leaves a detectable, repairable window. |
| Single writer | Global `O_EXCL` lease file with a separate heartbeat file | WF-06 / C6. Existence is the lock; expiry is classification, never permission. |
| Run evidence | One directory per run: `events.jsonl` (append-only) + derived `receipt.json` + artifacts + `acceptance.json` | Design 6. Interruption is appended, never a rewrite; history stays auditable. |
| CLI contract | One `factory` binary; `queue` JSON by default; `{outputVersion, command, ok, data, warnings, errors}`; exit codes 0/1/2/3 | D-05/D-08. Scripts need a stable shape and an idle-is-success signal. |
| Deployment target | Local run command (`node src/cli.ts --root <dir> …`, also `npm run cli -- …`) | C1/C8: infrastructure, providers, and TLS are later phases. The skeleton runs full-stack locally. |
| Directory layout | `src/domain` (pure, no fs) · `src/state` (fs adapters) · `src/runners` (adapter) · `src/commands` (application) · `src/util` · `factory/` (canonical data) · `test/` | Boundary rule from `project-setup.md`: machine-bound adapters at the edge, pure logic shared and import-free of fs/process. |

## Stack Touched in Phase 1

- [x] Project scaffold — `package.json` (exact pins, `type: module`), `tsconfig.json`, `.nvmrc`, `.gitignore`, `package-lock.json`
- [x] Routing — CLI dispatch in `src/cli.ts` with a command table; every command reachable by name
- [x] Database — real filesystem read **and** real write: work-item load/save/move, run `events.jsonl` append, `receipt.json` write
- [x] Interface — the CLI contract itself: JSON envelope on stdout, diagnostics on stderr, documented exit codes; approval prompt on a real TTY
- [x] Deployment — documented local full-stack run command (`npm run cli -- --root <dir> validate|queue|approve|run|accept`); no server, no container, no provider

## Out of Scope (Deferred to Later Slices)

> Explicit, so later phases do not re-litigate Phase 1 minimalism.

- Any network call, tracker (Plane/Paperclip), git host, CI system, deployment provider, model gateway, or Ollama route
- Coder workspaces, OpenCode, container images, Proxmox/TLS/domain configuration
- Running repository code in any form — no `child_process`, no shell, no `eval`
- YAML frontmatter or any YAML/`providers.yaml` parsing
- Concurrency beyond one active item; no orchestrator-driven starts
- Agent review records and deterministic check records (Phase 4 owns them; Phase 1 only reserves the run-evidence shape)
- Multi-repository *sync* — Phase 1 configures multiple repos locally, nothing more (`PROJ-01`)
- Database, webhook receiver, event inbox/outbox, backup automation (Phases 6–7)

## Subsequent Slice Plan

Each later phase adds one vertical slice on top of this skeleton without altering its architectural decisions:

- Phase 2: the run's model profile is filled by one measured local route; the `runner` adapter gains a model-backed implementation behind the unchanged `Runner` contract.
- Phase 3: the runner is replaced by a disposable-workspace implementation that produces a branch and linked PR/MR.
- Phase 4: deterministic checks and independent review append new evidence to the same run directory; human acceptance stays the same recorded decision.
- Phase 5: deployment actions append provider references to the same work item; Markdown remains canonical.
- Phase 6: reconciliation extends the same `reconcile` precedence to provider effects; logs/metrics correlate by `runId`.
- Phases 7–9: adapters, CI runners, and a second provider sit behind the same contracts; no workflow state moves out of Markdown.
