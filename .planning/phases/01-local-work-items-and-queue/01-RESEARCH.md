# Phase 1: Local Work Items and Queue - Research

**Researched:** 2026-11-22
**Domain:** Local-first Markdown workflow, atomic filesystem state, single-writer lease, deterministic queue, Node.js/TypeScript CLI
**Confidence:** HIGH for filesystem/Node/TypeScript mechanics; MEDIUM for the workflow-shape choices that the operator has not explicitly ratified (flagged in the Assumptions Log)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Work-item authoring and approval
- **D-01:** The operator creates and edits work-item Markdown directly. The CLI validates those files and owns controlled status transitions.
- **D-02:** The operator edits priority directly in Markdown; the CLI validates that the value fits the item category and queue rules.
- **D-03:** An approval command presents a summary of the work item and asks for confirmation before recording approval for the current revision.
- **D-04:** If scope or acceptance criteria change after approval, the CLI marks the item blocked until the operator approves the revised item.

#### Queue visibility
- **D-05:** Queue inspection defaults to JSON for automation. This output is a CLI contract; changing it after scripts depend on it would require compatibility handling. — **Reversibility:** costly — callers may depend on field names and exit/status semantics.
- **D-06:** Queue output includes the next eligible item and a short count summary.
- **D-07:** If no item is eligible, output explains the blockers and names affected work-item IDs.
- **D-08:** An idle queue is a successful, explicit state for scripts, not an error exit.

#### Local demo execution
- **D-09:** One CLI invocation processes eligible approved items sequentially until the queue is idle.
- **D-10:** The built-in demo runner writes a small harmless sample artifact and a run receipt. It does not execute arbitrary shell commands.
- **D-11:** If one demo run fails, the CLI blocks that item and continues with other eligible items.
- **D-12:** After a process interruption, the next run inspects the active run and provider/local state, then resumes the same run only when safe; otherwise it records interruption before starting a replacement.
- **D-13:** A run ends when human input or acceptance is required. The CLI records the pending decision; it does not keep a run waiting for the operator.

#### Carried forward from project decisions
- Work items are canonical local Markdown with a persistent UUID, human-readable fields, and machine-readable status metadata. Status transitions and file moves are validated and atomic.
- The queue selects the lowest-priority eligible item from `ready/`; all dependencies must be `done`. Unknown dependencies and cycles are validation errors. A blocked item does not hold the global active slot or prevent unrelated eligible work.
- The operator sets priorities in Phase 1. Scope changes require human reapproval. Checks, agent review, and human acceptance remain distinct decisions.
- Phase 1 includes only a built-in demonstration runner behind an explicit runner interface. External providers and arbitrary shell execution are out of scope.

### the agent's Discretion
- Exact CLI command names, work-item filename conventions beyond the persistent UUID requirement, JSON field naming, sample artifact content/location, and the human-readable diagnostic wording, provided the decisions above and the project plan's acceptance criteria are preserved.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within Phase 1 scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| WF-01 | The operator can create a canonical work item as local Markdown without a tracker. | `factory new` scaffold + the file format and required sections in §Design 1; manual authoring validated by `validate` (§Design 7). |
| WF-02 | Each work item has a persistent ID, category, priority, scope, acceptance criteria, dependencies, approvals, provider references, and run history. | Complete frontmatter schema + body grammar in §Design 1; run references + append-only run files in §Design 6. |
| WF-03 | Approval is bound to a work-item revision and becomes invalid if scope or acceptance criteria change. | Revision algorithm, normalization, storage, and drift detection in §Design 2; tests in §Validation Architecture. |
| WF-04 | The CLI validates status transitions and atomically updates status and work-item location. | Transition table + `rename`/rewrite protocol and crash windows in §Design 3. |
| WF-05 | The queue chooses the lowest-priority ready item whose dependencies are complete, and rejects unknown dependencies and cycles. | Queue predicate, comparator, dependency graph, and cycle detection in §Design 5. |
| WF-06 | At most one work item is globally active; a lease prevents duplicate execution. | `O_EXCL` lease, heartbeat, and ownership rules in §Design 4; concurrency test in §Validation Architecture. |
| WF-07 | After interruption or lease expiry, the factory checks the run and provider state before resuming or starting a replacement run. | Recovery classification, resume-vs-replace protocol, and append-only interruption event in §Design 4 and §Design 6. |
| WF-08 | The operator can validate and use the local workflow without a network connection or optional provider. | Zero runtime dependencies, no network imports, JSON config, offline tests in §Design 10 and §Validation Architecture. |
| PROJ-01 | The operator can configure multiple personal project repositories with distinct provider references and policy. | `factory/config.json` shape, repository keys, per-repo policy, and provider references in §Design 9. |
</phase_requirements>

## Summary

Phase 1 is a small, dependency-free state machine whose correctness comes from three properties: (1) every work item is a single canonical file whose machine fields are JSON and whose human fields are Markdown body sections; (2) every mutation is one controlled filesystem operation sequence with a known crash window and a deterministic repair rule; (3) the queue is a pure function over the loaded items plus a single global lease acquired with `O_EXCL`. The project plan already fixes the vocabulary and the acceptance bar; the research below turns that into file paths, data shapes, function signatures, exit codes, and tests.

The single most important design decision is to **separate what is hashed from what is stored**. Approval is not a boolean; it is `approval.revision` bound to a hash over the normalized *approved specification* (repository + scope + explicit exclusions + acceptance criteria). Any later read recomputes the hash; a mismatch is `approval-stale`, which excludes the item from the queue and causes `reconcile` to move it to `blocked/`. This directly satisfies WF-03 and success criterion 2 without trusting any stored "approved" flag.

The second most important decision is that **lease expiry is never permission to start work**. `O_EXCL` gives exactly one lease; expiry only marks uncertainty. `run` must classify the on-disk run, the owner process, and the runner's probe result, then either resume the same run ID or append `run.interrupted` and start a replacement. This is the plan's explicit rule and the project research's pitfall #6.

**Primary recommendation:** Build a zero-runtime-dependency Node 24 / TypeScript 7 CLI with JSON frontmatter + strict Markdown body sections, `temp → fsync → rename → fsync(dir)` writes, an `O_EXCL` lease with a separate heartbeat file, append-only JSONL run evidence, and `node:test` tests that use real temporary directories and an injected clock.

## Project Constraints (from AGENTS.md)

Actionable directives extracted from `/Users/ruben/Code/software-factory/AGENTS.md`. The planner must treat these as binding, on the same level as the CONTEXT.md locked decisions.

| # | Directive | Consequence for Phase 1 plans |
|---|-----------|-------------------------------|
| C1 | **Hosting:** self-host on the operator's Proxmox server; that is the target environment and part of the goal. | Nothing in Phase 1 may assume a hosted SaaS. The CLI, config, and state are local files. |
| C2 | **Cost:** base the stack on self-hosted, freely available software. | No paid services, no license-gated dependency. Phase 1 uses only Node, npm, and TypeScript (all free). |
| C3 | **Workflow source of truth:** versioned local Markdown and provider-neutral configuration define work and status; provider systems are replaceable executors, not owners of workflow state. | `factory/work-items/**/*.md` is authoritative. `providerRefs` are opaque and never used for identity or eligibility (Design 1, Design 9). |
| C4 | **Execution isolation:** run untrusted repository code in isolated workspaces/runners, never on the Proxmox host. | Phase 1 executes **no repository code at all**. The demo runner is in-process and `child_process` is forbidden and statically tested (Design 8, `test/no-shell.test.ts`). |
| C5 | **Human control:** scope changes, acceptance, and production authorization require human decisions. | Approval is human-triggered and revision-bound (Design 2, D-03/D-04); the runner can only return `needs-human`, never self-approve. |
| C6 | **Initial concurrency:** globally serialize active work items; leases and recovery must prevent duplicate work. | Single global lease via `O_EXCL`; queue selects exactly one item (Design 4, Design 5, WF-06). |
| C7 | **Implementation stack:** Node.js `24.22.3`, npm `11.19.1`, TypeScript `7.0.2`, `@types/node` `24.19.2`; pin and validate when implementation starts. | Exact pins in `package.json` and `.nvmrc`; no `^`/`~`; Environment Availability records that Node 24.22.3 must be installed. |
| C8 | **Infrastructure decisions** (hardware, network, domains, TLS, providers, backup, retention, local model) stay open until their phase. | Phase 1 must not configure TLS, networking, or providers. `factory/config.json` leaves every `providers` slot `null`. |
| C9 | **GSD workflow enforcement:** start file-changing work through a GSD command (`$gsd-execute-phase` for planned phase work); do not make direct repo edits outside a GSD workflow. | The phase is executed via `/gsd-execute-phase`; plans must be self-contained so executors do not improvise edits outside the plan. |
| C10 | **No project skills or conventions exist yet** (`.claude/skills`, `.agents/skills` absent; CONVENTIONS.md empty). | Plans define the conventions; do not reference nonexistent project skills. |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Work-item authoring and canonical content | Local filesystem (Markdown) | CLI validation | The plan makes local Markdown the source of truth; the CLI must never become the only place the content exists. |
| Frontmatter/body parsing and schema validation | Domain (pure functions) | — | Pure code over strings, no `fs` import; easiest to test exhaustively. |
| Revision hash and approval binding | Domain (pure functions) | Frontmatter storage | Hashing is pure; the approval record is persisted in frontmatter and the decisions log. |
| Status transitions and file moves | State adapter (`node:fs/promises`) | Domain transition table | Only the adapter knows about directories; the allowed transitions are pure policy. |
| Global lease | State adapter + OS (`O_EXCL`) | Domain recovery policy | The OS provides the atomic create; deciding whether an expired lease is safe to touch is domain logic. |
| Queue selection and dependency graph | Domain (pure functions) | State adapter (read all items) | Deterministic ordering and cycle detection need no I/O once items are loaded. |
| Run orchestration | Application service (`src/commands/run.ts`) | State adapter + runner adapter | Coordinates lease, run log, item transition, and runner; owns the crash-window ordering. |
| Run evidence | Local filesystem (append-only JSONL) | Application service | Append-only files survive crashes without rewriting history. |
| Demo execution | Runner adapter (`src/runners/demo.ts`) | — | Replaceable by a future Coder/OpenCode adapter behind the same interface. |
| Multi-repository configuration | Config adapter (JSON) | Domain validation | Local config only; provider references are opaque strings, never workflow state. |
| CLI and JSON contract | CLI boundary (`src/cli.ts`) | Output formatter | Exit codes and stdout/stderr separation are the scriptable contract. |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js | `24.22.3` | Runtime for the CLI and the test runner | Pinned by the project plan and PROJECT.md. Type stripping is stable in Node 24, so `.ts` files run directly with no build step. [CITED: nodejs.org/docs/latest-v24.x/api/typescript.html] |
| npm | `11.19.1` | Reproducible installs from the lockfile | The version bundled with Node 24.22.3; the plan pins it. Use `npm ci` in every fresh checkout. |
| TypeScript | `7.0.2` | Type checking only (`tsc --noEmit`) | Current stable (announced 2026-07-08, native port). Verified `7.0.2` is the latest npm version and that it accepts `erasableSyntaxOnly`. [CITED: devblogs.microsoft.com/typescript/announcing-typescript-7-0/] [VERIFIED: npm registry + local compile probe] |
| `@types/node` | `24.19.2` | Node API types | Matches the Node 24 major line. Published 2026-10-09. [VERIFIED: npm registry] `@types/node` [WARNING: flagged as suspicious (`too-new` on the latest dist-tag) — verify before using; planner adds `checkpoint:human-verify`.] |

### Supporting (all built into Node — no packages)

| API | Purpose | When to Use |
|-----|---------|-------------|
| `node:fs/promises` (`open`, `rename`, `mkdir`, `readdir`, `appendFile`, `unlink`, `stat`) | Atomic writes, moves, run-log appends | Every state mutation. `appendFile(..., { flush: true })` flushes the descriptor before closing (documented `fdatasync` semantics: data, not metadata). [CITED: nodejs.org/docs/latest-v24.x/api/fs.html] |
| `node:crypto` (`randomUUID`, `createHash`) | IDs and revision hashes | Work-item IDs, run IDs, lease IDs; SHA-256 revision. Never `Math.random()`. |
| `node:path` | Path composition and containment checks | All filesystem paths. |
| `node:util` (`parseArgs`) | CLI argument parsing | One parser, null-prototype result, no dependency. [CITED: nodejs.org/docs/latest-v24.x/api/util.html] |
| `node:readline/promises` | Interactive approval confirmation | Only when `stdin.isTTY`; otherwise require `--yes`. |
| `node:test` + `node:assert/strict` | Unit and integration tests | `node --test "test/**/*.test.ts"`; `.ts` test files are discovered by default in Node 24. [CITED: nodejs.org/docs/latest-v24.x/api/test.html] |
| `node:os` (`hostname`) | Lease owner identity | Lease records `{hostname, pid}`; PID liveness is only checked on the same host. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| JSON frontmatter + Markdown body sections | YAML frontmatter | YAML needs `js-yaml` or a hand-rolled subset parser; YAML implicit typing (unquoted scalars resolving to booleans, integers, or timestamps depending on the parser's schema version) creates silent type drift. JSON is valid YAML 1.2, so a future YAML reader can still parse the frontmatter. |
| Hand-written narrow validator + JSON Schema file | `ajv` | `ajv` is a large dependency for ~15 known fields. Keep `factory/schemas/work-item.schema.json` as the published contract and enforce parity with the TypeScript constants in a test. |
| `O_EXCL` lease file | `proper-lockfile` / `flock` | A dependency plus retry policy for something the OS already guarantees on a local filesystem. Node documents that `O_EXCL` makes `open()` fail if the file exists; `open(2)` notes the flag is racy on NFS without NFSv3+. |
| `node:test` | Vitest / Jest | A dependency, a transform pipeline, and config for tests that are mostly pure functions plus real temp directories. |
| Native type stripping | `tsx` / `ts-node` | Node 24 runs erasable TypeScript directly; `tsc` only type-checks. Fewer moving parts and no source maps needed. |
| Injected `Clock` interface | `mock.timers` only | `node:test` mock timers work for `Date` (verified), but injecting a `Clock` into lease/run functions makes expiry tests explicit and works in production code without test-only branches. Use `mock.timers` only if a global `Date` call slips through. |

**Installation:**

```bash
npm ci
```

There are **no runtime dependencies**. `package.json` has only `devDependencies: { "typescript": "7.0.2", "@types/node": "24.19.2" }` (exact pins, no `^`).

**Version verification:**

```bash
npm view typescript@7.0.2 version      # 7.0.2
npm view @types/node@24.19.2 version   # 24.19.2
node --version                          # must be v24.22.3 for the phase gate
```

`tsc --help` does not list `erasableSyntaxOnly`, but a real compile with the flag produced `TS1294` for an `enum`, confirming it is enforced. TypeScript 7.0 **does not ship a compiler API** (the announcement says the API arrives in 7.1); the project must not depend on `typescript` as a library, only as the `tsc` executable. [CITED: devblogs.microsoft.com/typescript/announcing-typescript-7-0/]

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `typescript` | npm | 14 yrs (created 2012-10-01) | 451,466,556/wk | github.com/microsoft/TypeScript | OK | Approved |
| `@types/node` | npm | 10 yrs (created 2016-05-17) | 670,661,744/wk | github.com/DefinitelyTyped/DefinitelyTyped | SUS (`too-new`) | Flagged — planner must add `checkpoint:human-verify` before install |

**Packages removed due to SLOP verdict:** none.

**Packages flagged as suspicious [SUS]:** `@types/node`. The seam's `too-new` signal is computed from the **latest** dist-tag (`26.6.6`, published 2026-10-28), not from the pinned `24.19.2` (published 2026-10-09, on the Node 24 line, from DefinitelyTyped). The package is not a slopsquat, but the protocol requires the checkpoint, so keep it. Neither package has a `postinstall` script.

*No package was discovered through WebSearch or training data alone; both are named in the project plan and confirmed against the npm registry and their official repositories.*

## Architecture Patterns

### System Architecture Diagram

```text
Operator
  │ writes / edits
  ▼
factory/work-items/<status>/<uuid>.md
  │  (JSON frontmatter + Problem / Scope / Out of Scope / Acceptance Criteria)
  ▼
`factory validate` ──► parse + schema + body grammar + dependency graph
  │                      │
  │                      └─ errors → exit 2, JSON envelope
  ▼
`factory approve <id>` ──► summary + confirmation
  │                          └─ approval.revision = hash(repository, scope, outOfScope, criteria)
  ▼
`factory queue` (read-only) ──► lease? ──► eligible set ──► min(priority, createdAt, id)
  │                                │
  │                                └─ busy / needs-recovery → state, exit 0 (queue) / 3 (run)
  ▼
`factory run`
  │ 1. reconcile (explicit mutation)
  │ 2. acquire lease (open 'wx') ──► EEXIST → classify, refuse or resume
  │ 3. mkdir runs/<runId>/ + append run.started (flush)
  │ 4. move item ready → in-progress (rename, then rewrite frontmatter)
  │ 5. heartbeat loop (state/lease.heartbeat)
  │ 6. runner.run({workItem, revision, runId, artifactDir})
  │       └─ demo runner writes artifacts/demo-report.md — no shell
  │ 7. append terminal event (completed | failed | needs-human)
  │ 8. write receipt.json (atomic)
  │ 9. move item → done | blocked; release lease
  │10. loop until queue idle
  ▼
factory/runs/<runId>/events.jsonl  (append-only; never rewritten)
```

Crash/recovery path: any interruption leaves either a lease without a run, a run without a terminal event, or an item whose directory and frontmatter disagree. `factory status` reports the exact state; `factory run` resumes only when the run ID, revision, owner process, and runner probe all agree; otherwise it appends `run.interrupted` and starts a replacement.

### Recommended Project Structure

```text
software-factory/
├── package.json                 # type: module, exact devDependency pins, scripts
├── package-lock.json
├── tsconfig.json                # noEmit, erasableSyntaxOnly, verbatimModuleSyntax, types:["node"]
├── .nvmrc                       # 24.22.3
├── .gitignore                   # factory/state/ and *.tmp
├── factory/
│   ├── WORKFLOW.md              # human policy: states, gates, approval rules (not parsed)
│   ├── config.json              # repositories + policy + lease/run limits
│   ├── schemas/
│   │   └── work-item.schema.json
│   ├── work-items/
│   │   ├── ready/<uuid>.md
│   │   ├── in-progress/<uuid>.md
│   │   ├── blocked/<uuid>.md
│   │   └── done/<uuid>.md
│   ├── decisions/<workItemId>/approvals.jsonl
│   ├── runs/<runId>/events.jsonl
│   ├── runs/<runId>/receipt.json
│   ├── runs/<runId>/artifacts/demo-report.md
│   └── state/                   # runtime only; gitignored
│       ├── lease.json
│       └── lease.heartbeat
├── src/
│   ├── cli.ts                   # argv → command → envelope → exit code
│   ├── commands/
│   │   ├── validate.ts
│   │   ├── queue.ts
│   │   ├── approve.ts
│   │   ├── new.ts
│   │   ├── run.ts
│   │   ├── status.ts
│   │   ├── show.ts
│   │   ├── resume.ts
│   │   ├── close.ts
│   │   └── reconcile.ts
│   ├── domain/                  # pure: no node:fs, node:process, node:child_process
│   │   ├── work-item.ts         # types, field constants, schema validation
│   │   ├── frontmatter.ts       # split/parse/serialize
│   │   ├── body.ts              # section extraction + line numbers
│   │   ├── revision.ts          # normalization + sha256
│   │   ├── priority.ts          # bands + uniqueness
│   │   ├── dependencies.ts      # graph + cycles
│   │   ├── queue.ts             # eligibility + ordering + blockers
│   │   └── transitions.ts       # allowed status transitions
│   ├── state/
│   │   ├── atomic-file.ts       # writeFileAtomic + fsyncDirectory
│   │   ├── work-item-store.ts   # load all / save / move
│   │   ├── lease.ts             # acquire / heartbeat / release / classify
│   │   └── run-log.ts           # append / replay / receipt
│   ├── runners/
│   │   ├── contract.ts          # Runner, RunnerInput, RunnerResult, Artifact
│   │   ├── demo.ts
│   │   └── registry.ts
│   ├── config/
│   │   └── config.ts            # load + validate factory/config.json
│   └── util/
│       ├── clock.ts             # Clock interface + systemClock
│       ├── errors.ts            # typed error codes
│       └── output.ts            # envelope, human formatting, exit codes
└── test/
    ├── helpers/temp-factory.ts  # mkdtemp fixture builder
    ├── fixtures/                # .json / .md only (never .ts — see pitfall 11)
    ├── work-item.test.ts
    ├── frontmatter.test.ts
    ├── body.test.ts
    ├── revision.test.ts
    ├── priority.test.ts
    ├── dependencies.test.ts
    ├── queue.test.ts
    ├── atomic-file.test.ts
    ├── transitions.test.ts
    ├── lease.test.ts
    ├── run-log.test.ts
    ├── recovery.test.ts
    ├── config.test.ts
    ├── no-shell.test.ts
    └── cli.test.ts
```

### Pattern 1: One canonical file, two layers

**What:** Machine state is a single JSON object between `---` delimiters; human content is Markdown body sections with a strict grammar. The CLI parses both and treats the file as one unit.

**When to use:** Always. This is the work-item contract.

**Why not all-JSON:** D-01 says the operator edits Markdown directly. Multi-paragraph scope text inside a JSON string requires `\n` escapes and is hostile to hand editing. Body sections keep the item readable in any Markdown viewer and keep the frontmatter small enough to audit.

**Why not all-body:** Identity, status, priority, and approval must be unambiguous to parse; JSON gives that for free and is a YAML subset.

### Pattern 2: Hash the contract, not the file

**What:** `approval.revision` is a hash of the normalized *approved specification* — repository, scope, explicit exclusions, and acceptance criteria — not of the raw bytes. Formatting-only edits (CRLF, trailing spaces, blank lines) do not invalidate; content edits do.

**When to use:** Every read of a work item; every `approve`; every run start.

**Why:** Raw-byte hashing makes approvals fragile (editors rewrite line endings) and therefore trains the operator to re-approve blindly. Semantic hashing makes invalidation meaningful.

### Pattern 3: Move first, rewrite second, reconcile third

**What:** A status change is `rename(source, destination)` followed by an atomic rewrite of the frontmatter in the destination. The file is never copied. If the process dies between the two steps, the directory and frontmatter disagree; `reconcile` resolves the disagreement with a fixed precedence.

**When to use:** Every status transition (`ready ↔ in-progress ↔ blocked → done`).

**Why:** POSIX `rename` atomically replaces the destination and guarantees there is no moment when the destination name is missing, but it also warns that both names may refer to the file during the operation. Writing a temp file into the destination and renaming *over* the source would leave a duplicate-ID window; renaming the source and then rewriting leaves only a stale-field window, which is detectable and repairable.

### Pattern 4: Lease by existence, not by content

**What:** The lease file is created with `open(path, 'wx')`. Its mere existence is the lock. It is never rewritten; heartbeat data lives in a separate file keyed by `leaseId`. Release is `unlink`.

**When to use:** Every `run`, `resume`, and `reconcile` that might start or finish work.

**Why:** A read-modify-write lock file has a TOCTOU race. `O_EXCL` is a single atomic kernel operation. A separate heartbeat file means an old process cannot clobber a new lease by writing its own heartbeat.

### Anti-Patterns to Avoid

- **Boolean approval:** `approved: true` with no revision. It survives content edits and defeats WF-03.
- **Copy + unlink for moves:** `copyFile` is explicitly non-atomic in the Node docs and loses the rename guarantee; it also creates a duplicate-ID window.
- **Auto-resume on expiry:** Treating `expiresAt < now` as "the old process is gone". It may be paused, not dead.
- **Mutating on read:** `queue` or `status` moving files. Inspection must be side-effect free; `reconcile` is the only repair command.
- **YAML implicit typing:** an unquoted `priority` or `owner` resolving to a number or boolean depending on the parser's schema version. JSON avoids the class.
- **`access()` then `open()`:** A TOCTOU pattern; open directly and handle `ENOENT`/`EEXIST`.
- **Shelling out for "just the demo":** Any `child_process` import makes the no-arbitrary-execution boundary unverifiable.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| YAML parsing | A YAML subset parser | JSON frontmatter | YAML edge cases (anchors, implicit types, multi-line scalars) are a bug farm; JSON is built in. |
| General JSON Schema validation | A full validator | Narrow field-by-field validator + schema parity test | You need 15 fields, not draft-2020-12. The schema file is documentation/editor support; the validator is the executable contract. |
| Atomic file replacement | `writeFile` or `copyFile` + `unlink` | `open('wx')` temp → `writeFile` → `sync()` → `close()` → `rename()` → fsync dir | Node's `writeFile` does not fsync; `copyFile` explicitly has no atomicity guarantee. |
| Directory durability | Assume rename is enough | `open(dir, 'r')` + `sync()` (best effort) | `fsync(2)` states that fsync on a file does not ensure the directory entry reached disk. |
| File locking | PID-file spinlocks | `open('wx')` + heartbeat file | `O_EXCL` is atomic; spinlocks need timeouts, retries, and stale detection anyway. |
| UUID generation | `Math.random()` string | `crypto.randomUUID()` | RFC 4122 v4, cryptographically strong, built in. |
| Hashing | Hand-rolled hash | `crypto.createHash('sha256')` | Never hand-roll cryptography. |
| CLI parsing | `process.argv` regex | `util.parseArgs` | Handles `--flag=value`, short flags, positionals, and returns a null-prototype object. |
| Date/time | `new Date()` scattered through code | Injected `Clock` | Lease expiry tests need to move time without sleeping. |
| Test framework | Jest/Vitest setup | `node:test` | Built in, discovers `.ts`, supports `describe/it`, hooks, and mock timers. |
| Glob traversal | Recursive custom walker | Fixed `readdir` of four status directories | The layout is fixed; no glob dependency or recursion needed. |

**Key insight:** Almost every "we need a library" impulse in this phase is actually a "we need a stricter file format or a single atomic syscall" impulse. The only third-party packages are the compiler and its type definitions.
## Detailed Design Decisions

### Design 1: Work-item file format

**Decision:** one canonical file per work item at `factory/work-items/<status>/<uuid>.md`; machine fields in a single JSON object between `---` lines; human content in strict Markdown body sections.

The status directory names are fixed by the plan (`software-factory-projectplan.md:69-73`):

```text
  work-items/
    ready/ <uuid>.md
    in-progress/
    blocked/
    done/
```
 The plan also states: "Mappen weerspiegelen status voor leesbaarheid; frontmatter is de machineleesbare statusbron." (`software-factory-projectplan.md:79`). So the frontmatter is authoritative and the directory is a projection; a mismatch is an error until `reconcile` repairs it.

#### Frontmatter fields

| Field | Type | Required | Owner | Mutability | Notes |
|-------|------|----------|-------|------------|-------|
| `schemaVersion` | integer (`1`) | yes | CLI | immutable | Enables future migrations. |
| `id` | UUID string | yes | CLI | immutable | `crypto.randomUUID()`; filename must be `<id>.md`. |
| `title` | string, 1..200 chars | yes | operator | mutable | Not part of the approval hash. |
| `category` | `"incident" \| "issue" \| "planbaar-werk"` | yes | operator | mutable | Verbatim from `software-factory-projectplan.md:56`: "De categorie (`incident`, `issue` of `planbaar-werk`)". |
| `priority` | integer ≥ 0 | yes | operator | mutable | Band-checked against category; unique among non-`done` items. |
| `workflowStatus` | `"ready" \| "in-progress" \| "blocked" \| "done"` | yes | CLI | mutable | Must equal the containing directory. |
| `triageStatus` | `"needs-triage" \| "needs-info" \| "ready-for-agent" \| "wontfix"` | yes | CLI | mutable | **New in this phase** (the plan does not define triage values). `approve` sets `ready-for-agent`; drift/failure sets `needs-triage`/`needs-info`. |
| `owner` | string, 1..100 chars | yes | operator | mutable | The responsible human. Self-asserted; not an auth boundary. |
| `repository` | string key | yes | operator | mutable | Must exist in `factory/config.json`. Part of the approval hash. |
| `targetBranch` | string | yes | operator | mutable | Defaults from config at scaffold time; part of the approval hash. |
| `dependencies` | UUID string[] | yes (may be `[]`) | operator | mutable | Must reference existing items; all must be `done` for eligibility. |
| `approval` | `null \| { revision, approvedAt, approvedBy }` | yes (may be `null`) | CLI | mutable | `revision` is `sha256:<hex>`; see Design 2. |
| `providerRefs` | `Record<string, { provider, ref }>` | yes (may be `{}`) | operator/CLI | mutable | Opaque references; never identity, never eligibility. |
| `runReferences` | string[] | yes (may be `[]`) | CLI | mutable | Append-only run IDs; details live in `factory/runs/`. |
| `createdAt` | ISO 8601 UTC string | yes | CLI | immutable | `clock.now().toISOString()`. |
| `updatedAt` | ISO 8601 UTC string | yes | CLI | mutable | Last CLI mutation; not a substitute for run timestamps. |

Unknown fields are **rejected** (`additionalProperties: false` semantics). This catches typos such as `dependancies` instead of silently ignoring them. Validate with `Object.hasOwn` and never merge untrusted objects into defaults.

#### Body grammar

Exactly these level-2 headings are required, in any order:

| Heading | Content | Hashed into approval? |
|---------|---------|----------------------|
| `## Problem` | Free prose: desired user behavior and problem description. | No (context; put binding statements in Scope). |
| `## Scope` | Free prose: what is included. | Yes. |
| `## Out of Scope` | Free prose: explicit exclusions; `None.` is allowed. | Yes. |
| `## Acceptance Criteria` | Checkbox list only: `- [ ] ...` or `- [x] ...`, at least one item. | Yes (criterion text only; checkbox state is progress, not scope). |

Optional recognized sections (not hashed): `## Public Interfaces`, `## Delivery Environment`, `## Database Changes`, `## Architecture Decisions`, `## Notes`.

Parsing rules, in order:

1. Reject a missing frontmatter block or a missing closing `---`.
2. Scan the body line by line. Track fenced code blocks opened by a line whose first non-space run is ``` or ~~~ and closed by the same marker; **ignore heading-like lines inside fences**.
3. A section starts at a line matching `^## (?!#)` whose trimmed text exactly equals one of the recognized headings (case-sensitive). Content runs until the next level-2 heading or EOF. Duplicate headings are an error with both line numbers.
4. Missing required headings are an error naming the missing heading.
5. In `## Acceptance Criteria`, every non-blank line must match `^\s*[-*]\s+\[( |x|X)\]\s+(.+?)\s*$`. Anything else (a paragraph, a non-checkbox bullet, a nested list) is `invalid-acceptance-criterion` with a line number.
6. Body size limit: 1 MiB. Frontmatter size limit: 64 KiB. Reject larger files before parsing (DoS guard).
7. Accept and strip a UTF-8 BOM; normalize CRLF/CR to LF for parsing. The file on disk is written with LF.

#### Example

The following is one complete work-item file. The `##` headings inside the fenced block are part of the example content, not sections of this research document.

```markdown
---
{
  "schemaVersion": 1,
  "id": "5bc84dd0-4699-4fc9-98c6-1941a731663f",
  "title": "Validate local work items",
  "category": "planbaar-werk",
  "priority": 210,
  "workflowStatus": "ready",
  "triageStatus": "needs-triage",
  "owner": "ruben",
  "repository": "example-app",
  "targetBranch": "main",
  "dependencies": [],
  "approval": null,
  "providerRefs": {},
  "runReferences": [],
  "createdAt": "2026-11-22T20:00:00.000Z",
  "updatedAt": "2026-11-22T20:00:00.000Z"
}
---

## Problem

The operator cannot tell whether a work-item file is complete before starting work.

## Scope

Add a `factory validate` command that checks the schema, the body grammar, dependencies, priorities, and approval drift.

## Out of Scope

Network access, tracker synchronization, and execution.

## Acceptance Criteria

- [ ] A valid item exits 0 with an empty error list.
- [ ] An unknown dependency is reported with the dependency ID.
- [ ] Editing one acceptance criterion invalidates the previous approval.
```

#### Identity versus mutable state

- **Identity (never changes):** `schemaVersion`, `id`, `createdAt`. Renaming the file or moving directories does not change identity.
- **CLI-owned state:** `workflowStatus`, `triageStatus`, `approval`, `runReferences`, `updatedAt`. The operator must not hand-edit these; if they do, validation reports the inconsistency rather than trusting it.
- **Operator-owned content:** `title`, `category`, `priority`, `owner`, `repository`, `targetBranch`, `dependencies`, `providerRefs`, and all body sections.
- **Never identity:** category, priority, owner, repository, provider references, filename, directory.

### Design 2: Approval bound to a revision

**Decision:** `approval.revision` is `sha256:<hex>` over a length-prefixed canonical encoding of the *approved specification*:

```text
repository
targetBranch
scope
outOfScope
acceptanceCriteria[0..n]   (criterion text, in file order)
```

Scope and acceptance criteria are the floor required by D-04/WF-03. `repository` and `targetBranch` are included because the plan's delivery contract lists "Repository, doelbranch en goedgekeurde specificatieversie" as part of what is approved (`software-factory-projectplan.md:344`) and because the same prose applied to another repository is a different specification. `## Out of Scope` is included because an exclusion is part of scope. **Not** included: `title`, `category`, `priority`, `owner`, `dependencies`, `providerRefs`, checkbox state, and `## Problem`.

#### Normalization (exact rules)

For `scope` and `outOfScope`:

1. Normalize CRLF/CR to LF.
2. Remove trailing spaces and tabs from every line.
3. Trim leading and trailing blank lines.
4. Collapse runs of 2+ blank lines to a single blank line.
5. Preserve internal spacing, indentation, punctuation, and case exactly.

For each acceptance criterion:

1. Take the captured text after the checkbox marker.
2. Trim leading/trailing whitespace.
3. Collapse internal runs of spaces/tabs to one space.
4. Preserve punctuation and case.

For `repository` and `targetBranch`: use the exact stored strings (already validated against config).

#### Canonical encoding

Do **not** concatenate raw strings with a delimiter. Length-prefix every field so a criterion containing the delimiter cannot collide:

```ts
import { createHash } from 'node:crypto';

const REVISION_FORMAT = 'sf-revision-v1';

function field(value: string): string {
  return `${Buffer.byteLength(value, 'utf8')}:${value}`;
}

export function computeRevision(input: {
  repository: string;
  targetBranch: string;
  scope: string;
  outOfScope: string;
  acceptanceCriteria: string[];
}): string {
  const criteria = input.acceptanceCriteria.map(normalizeCriterion);
  const payload = [
    REVISION_FORMAT,
    field(input.repository),
    field(input.targetBranch),
    field(normalizeBlock(input.scope)),
    field(normalizeBlock(input.outOfScope)),
    String(criteria.length),
    ...criteria.map(field),
  ].join('\n');
  return `sha256:${createHash('sha256').update(payload, 'utf8').digest('hex')}`;
}
```

`REVISION_FORMAT` is part of the hashed payload. Changing normalization or fields requires bumping it to `sf-revision-v2`; old approvals then simply become stale, which is the correct failure mode.

#### Where the hash lives

- `approval.revision` in the item's frontmatter — the current effective approval.
- `run.started` event — the revision the run was started for.
- `factory/decisions/<workItemId>/approvals.jsonl` — append-only audit of `approved` and `invalidated` decisions, each with `revision`, `at`, `by`, and `reason`.

There is **no** stored `currentRevision` field. Computing it on every read removes a second source of truth that can drift.

#### Drift detection

Every load computes `currentRevision`. Then:

```ts
const drift =
  item.approval !== null && item.approval.revision !== currentRevision;
```

- `validate` reports `approval-stale` (error) with both revisions.
- `queue` excludes the item and lists `approval-stale` in its blockers; it does not mutate.
- `status` lists it under `approvalDrift`.
- `reconcile` (mutating) moves the item to `blocked/`, sets `workflowStatus: "blocked"` and `triageStatus: "needs-triage"`, sets `approval: null`, and appends an `invalidated` decision line. The previously approved revision remains in the decisions log.
- `run` calls `reconcile` before claiming, so it cannot execute a stale approval.
- `approve` always records the *currently computed* revision; it never accepts a revision argument.

Items in `done/` are historical and are not drift-checked.

#### Approval command behavior (D-03)

1. Load and fully validate the item. Refuse if invalid, if `workflowStatus` is `done` or `in-progress`, or if any acceptance criterion is still a placeholder (`TODO`, `<!-- ... -->`, or the scaffold marker).
2. Print a summary to **stderr** (so stdout stays machine-readable): id, title, repository/branch, category/priority, dependencies with status, scope excerpt, numbered criteria, and the short revision (`sha256:` + first 12 hex).
3. If `stdin` is not a TTY and `--yes` is absent, exit 2 with `confirmation-required`.
4. Ask `Approve this revision? [y/N]`; only `y`/`yes` (case-insensitive) proceeds.
5. Append `{action:"approved", revision, at, by}` to the decisions log (flush).
6. Atomically rewrite the item with `approval: {revision, approvedAt: at, approvedBy: owner}`, `triageStatus: "ready-for-agent"`, `updatedAt: at`; if the item was in `blocked/`, move it to `ready/` in the same controlled transition (Design 3).
7. Return the revision and the new state in the JSON envelope.

If the operator edits only formatting after approval, the revision is unchanged and the item stays eligible. If the operator edits a criterion, the revision changes and the item is excluded until re-approved.
### Design 3: Atomic file operations and status transitions

**Decision:** every mutation goes through `src/state/atomic-file.ts`; every status change is `rename` followed by an atomic frontmatter rewrite; a mismatch is repaired by `reconcile` with fixed precedence.

#### `writeFileAtomic`

```ts
import { open, rename, unlink, mkdir } from 'node:fs/promises';
import { dirname, join, basename } from 'node:path';
import { randomUUID } from 'node:crypto';

export async function writeFileAtomic(
  path: string,
  contents: string,
  mode = 0o644,
): Promise<void> {
  const dir = dirname(path);
  await mkdir(dir, { recursive: true });
  const temp = join(dir, `.tmp-${basename(path)}-${process.pid}-${randomUUID()}`);
  const handle = await open(temp, 'wx', mode);
  try {
    await handle.writeFile(contents, 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    await rename(temp, path);
    await fsyncDirectory(dir);
  } catch (error) {
    await unlink(temp).catch(() => {});
    throw error;
  }
}
```

Why each step:

- `open(temp, 'wx')` — fails if the temp name exists; never truncates an existing file.
- `handle.sync()` — `fsync(2)`; `fs.writeFile` alone does **not** flush to the device.
- `rename` — POSIX atomically replaces the destination; the destination name is never missing. [CITED: man7.org/linux/man-pages/man2/rename.2.html] [CITED: pubs.opengroup.org/onlinepubs/9799919799/functions/rename.html]
- `fsyncDirectory` — `fsync(2)`: "Calling fsync() does not necessarily ensure that the entry in the directory containing the file has also reached disk. For that an explicit fsync() on a file descriptor for the directory is also needed." [CITED: man7.org/linux/man-pages/man2/fsync.2.html]
- On failure, remove the temp; on success, the temp no longer exists.

```ts
import { open } from 'node:fs/promises';
import type { FileHandle } from 'node:fs/promises';

export async function fsyncDirectory(dir: string): Promise<void> {
  let handle: FileHandle | undefined;
  try {
    handle = await open(dir, 'r');
    await handle.sync();
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code !== 'EINVAL' && code !== 'EPERM' && code !== 'EBADF' &&
        code !== 'EISDIR' && code !== 'ENOTSUP') {
      throw error;
    }
  } finally {
    await handle?.close();
  }
}
```

The macOS probe on 2026-11-22 confirmed that `open(dir, 'r')` + `sync()` succeeds on APFS. The tolerance list exists for filesystems that reject directory fsync; it must not swallow real I/O errors.

#### Status transition protocol

Allowed transitions (everything else is `invalid-transition`):

| From | To | Trigger |
|------|----|---------|
| `ready` | `in-progress` | `run` claims the item |
| `ready` | `blocked` | `reconcile` finds stale approval |
| `in-progress` | `done` | run outcome `succeeded` |
| `in-progress` | `blocked` | run outcome `failed` / `needs-human` / `interrupted` |
| `blocked` | `ready` | `approve` records a fresh approval |

`done` is terminal in Phase 1. There is no hand-edited status path: the CLI writes `workflowStatus` and the directory together.

A transition is:

1. Validate the transition against the table and the current frontmatter/directory agreement.
2. Refuse if the destination path already exists (duplicate ID) or is on a different device.
3. `rename(sourcePath, destinationPath)` — same filesystem, atomic.
4. Build the new contents with the new `workflowStatus` and `updatedAt`; `writeFileAtomic(destinationPath, newContents)`.
5. `fsyncDirectory` both source and destination directories (best effort).

Order matters. `rename` first means the item is never duplicated and never lost; the only crash residue is a file whose frontmatter still names the old status. Reversing the order would leave a file in the old directory claiming the new status, which is equally detectable but leaves the human-visible tree stale.

Node's `copyFile` is explicitly not atomic ("No guarantees are made about the atomicity of the copy operation") and must not be used for moves. A cross-device `rename` fails with `EXDEV`; the CLI must fail loudly with a message telling the operator that `factory/` must live on one filesystem. **Never** fall back to copy+unlink: that reintroduces the duplicate window.

#### Crash windows

| Operation | Crash point | On-disk result | Detection | Repair |
|-----------|-------------|----------------|-----------|--------|
| `writeFileAtomic` | before rename | orphan `.tmp-*` | prefix scan | delete temps older than 1 h in `reconcile` |
| `writeFileAtomic` | after rename | new content, durable | none | — |
| status move | after `rename`, before rewrite | file in new dir, old `workflowStatus` | dir/frontmatter mismatch | `reconcile` moves back per frontmatter (unless a terminal run says otherwise) |
| lease acquire | after create, before run dir | lease with no run | lease + no run dir | `reconcile` removes it after expiry |
| run start | after `mkdir`, before `run.started` | empty run dir | zero events | `reconcile` removes the dir and lease after expiry |
| run start | after `run.started`, before item move | run open, item still `ready` | run non-terminal | resume re-applies the transition idempotently |
| runner | mid-artifact write | partial artifact | sha256 mismatch | demo runner rewrites deterministically; future runners must be idempotent or probe |
| terminal event | before append | run open | `deriveRunState` non-terminal | resume / probe / close |
| receipt | before write | events terminal, no receipt | replay | `reconcile` writes the receipt from events |
| item transition | after terminal event | run terminal, item `in-progress` | run/item mismatch | `reconcile` applies the terminal transition |
| lease release | before unlink | expired lease + terminal run | expiry + terminal | `reconcile` releases |

#### `reconcile` precedence

`reconcile` is the **only** command allowed to repair derived state. It runs in this order so a terminal run always beats a stale directory:

1. Delete orphan `.tmp-*` files older than one hour.
2. Replay every run; finalize terminal runs (write a missing receipt, apply the terminal item transition).
3. Release leases whose run is terminal, and leases with no run that are past expiry.
4. Invalidate stale approvals (`approval-stale` → `blocked`, `approval: null`, `needs-triage`).
5. Repair directory/frontmatter mismatches using the frontmatter as authority.
6. Report duplicate IDs, unknown repositories, and invalid transitions as errors; take no destructive action for them.

`validate`, `queue`, and `status` are read-only. They report the same conditions but never write. This keeps inspection safe for scripts and makes `reconcile` auditable.

### Design 4: Global lease and single active writer

**Decision:** `factory/state/lease.json` created with `O_EXCL`; a separate `factory/state/lease.heartbeat`; expiry is uncertainty, never permission.

#### Lease record

```json
{
  "leaseId": "1e9220ac-7677-42ca-9c72-3bd732993d36",
  "runId": "0b6f0f1e-6f6a-4f0e-9d0e-2a1b3c4d5e6f",
  "workItemId": "5bc84dd0-4699-4fc9-98c6-1941a731663f",
  "workItemRevision": "sha256:...",
  "owner": { "hostname": "factory-host", "pid": 4242, "user": "ruben" },
  "acquiredAt": "2026-11-22T21:00:00.000Z",
  "expiresAt": "2026-11-22T21:05:00.000Z"
}
```

Heartbeat:

```json
{ "leaseId": "...", "runId": "...", "at": "...", "expiresAt": "..." }
```

The lease file is immutable after creation. The owner rewrites only `lease.heartbeat` (atomic write) every `heartbeatIntervalSeconds`. A new owner deletes the old heartbeat on acquire and release. This prevents an old process from clobbering a new lease by heartbeating.

#### Acquire

```ts
import { open } from 'node:fs/promises';

export async function acquireLease(
  paths: FactoryPaths,
  lease: LeaseRecord,
): Promise<LeaseRecord> {
  let handle: FileHandle | undefined;
  try {
    handle = await open(paths.leaseFile, 'wx', 0o600);
    await handle.writeFile(`${JSON.stringify(lease)}\n`, 'utf8');
    await handle.sync();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      throw new LeaseHeldError(paths.leaseFile);
    }
    throw error;
  } finally {
    await handle?.close();
  }
  await fsyncDirectory(paths.stateDir);
  await unlinkIfExists(paths.heartbeatFile);
  return lease;
}
```

`O_EXCL` is the lock: Node documents the flag as "opening a file should fail if the `O_CREAT` flag is set and the file already exists" [CITED: nodejs.org/docs/latest-v24.x/api/fs.html], and Linux `open(2)` adds that "On NFS, `O_EXCL` is supported only when using NFSv3 or later on kernel 2.6 or later. In NFS environments where `O_EXCL` support is not provided, programs that rely on it for performing locking tasks will contain a race condition." [CITED: man7.org/linux/man-pages/man2/open.2.html] Therefore `factory/` must be on a local filesystem (the project is a single Proxmox host; the checkout is on APFS/ext4/xfs, not NFS/SMB).

#### Classify

Effective expiry is `max(lease.expiresAt, heartbeat.expiresAt)` **only when** `heartbeat.leaseId === lease.leaseId`; otherwise use `lease.expiresAt`.

| Lease | Heartbeat | Owner PID | Open run | Classification | Action |
|-------|-----------|-----------|----------|----------------|--------|
| absent | — | — | no | `idle` | proceed |
| absent | — | — | yes | `orphan-run` | recovery protocol |
| present, not expired | fresh | alive/unknown | any | `active` | refuse (exit 3) |
| present, expired | stale/absent | alive | any | `held-alive` | refuse (exit 3) |
| present, expired | stale/absent | dead | yes | `expired` | recovery protocol |
| present, expired | stale/absent | dead | no | `orphan-lease` | `reconcile` removes |
| present, any | any | other host | any | `held-uncertain` | refuse; manual `close` only |
| present, any | any | any | terminal | `stale-terminal` | finalize + release |

PID liveness is checked only when `owner.hostname === os.hostname()`: `process.kill(pid, 0)` returns normally or throws `EPERM` (alive, not ours) / `ESRCH` (dead). A probe against PID 999999 returned `ESRCH`. On another host, PID is meaningless; refuse rather than guess.

#### Why expiry must not auto-resume

The plan states: "Een lease verloopt niet tot heruitvoering zonder verificatie van de runstatus: een veilige hervatting gebruikt dezelfde run; anders wordt die run als onderbroken vastgelegd en start een nieuwe run." (`software-factory-projectplan.md:79`). The failure it prevents:

- The old process may be paused (SIGSTOP, VM suspend, GC, slow disk) but still alive and still holding an open file or a provider connection.
- The runner may have written an artifact or performed an external action before the lease expired; a new run would repeat it.
- Clock skew between the lease writer and the reader can make a live lease look expired.
- Two writers on the same item is the one invariant the whole workflow depends on (WF-06).

So expiry triggers **classification**, never acquisition. Only a dead owner process on the same host, a conclusive runner probe, and an unchanged revision permit a resume.

#### Resume versus replace

```text
classify(lease, runs, items, now, host)
├── active | held-alive | held-uncertain  → exit 3; no mutation
└── expired | orphan-run
    ├── run already terminal              → finalize (receipt + item transition), release
    ├── item revision ≠ run.revision      → append run.interrupted(reason=revision-changed); block item
    ├── runner.probe(runId) = completed   → append the missing terminal event; finalize
    ├── runner.probe(runId) = not-started → safe resume: acquire lease with the SAME runId,
    │                                        append run.resumed, continue the run
    └── probe unknown / in-flight         → demo: append run.interrupted, release, start a
                                             replacement run (new runId, attempt+1)
                                             future runners: exit 3 until probe is conclusive
```

Resume **reuses the run ID**. A replacement gets a new run ID and `attempt = previous + 1`. The old run's `events.jsonl` is never edited; `run.interrupted` is appended. This satisfies D-12 and WF-07.

`factory run` performs this automatically (D-12: "the next run inspects..."). `factory resume <runId>` and `factory close <runId> --outcome interrupted|failed|abandoned` exist for the operator when the automatic path refuses.

#### Heartbeat and release

- Heartbeat interval: `max(5s, floor(ttl/3))`; default TTL 300 s, heartbeat 30 s.
- Heartbeat write failure is a warning, not a run failure; expiry still protects against a dead process.
- Release order: unlink `lease.json` first (frees the slot), then `lease.heartbeat`, then fsync `state/`. A leftover heartbeat whose `leaseId` does not match is ignored.
- On process exit (`SIGINT`/`SIGTERM`), attempt a graceful release; `SIGKILL` leaves the lease for expiry-based recovery.

### Design 5: Queue selection

**Decision:** the queue is a pure function over all loaded items plus the lease classification. It selects the eligible item with the **lowest numeric `priority` value** (highest priority), then `createdAt`, then `id`.

> **Resolution of "lowest-priority eligible item":** it means the **lowest numeric priority value**, i.e. the most important item. `priority: 0` outranks `priority: 201`. This follows `software-factory-projectplan.md:56`: "Lagere waarden worden eerder uitgevoerd; tussenwaarden en herschikking zijn toegestaan." and `software-factory-projectplan.md:518`: "Hij kiest het laagste unieke prioriteitsnummer uit uitvoerbare `ready/`-items".

#### Eligibility predicate

```ts
export function isEligible(
  item: WorkItem,
  byId: ReadonlyMap<string, WorkItem>,
  currentRevision: string,
): boolean {
  return (
    item.workflowStatus === 'ready' &&
    item.triageStatus === 'ready-for-agent' &&
    item.approval !== null &&
    item.approval.revision === currentRevision &&
    item.dependencies.every((id) => byId.get(id)?.workflowStatus === 'done')
  );
}
```

The global lease is checked separately: even an eligible item is not claimed while a lease or open run exists. A blocked item is never in the eligible set, so it cannot consume the active slot. Dependents of a blocked item simply fail the `every(done)` check.

#### Priority bands and uniqueness

The plan fixes the bands (`software-factory-projectplan.md:56`): "Prioriteitsbanden zijn respectievelijk 0–100, 101–200 en vanaf 201. ... De prioriteit moet bij de categorie passen." So:

| Category | Valid priority |
|----------|----------------|
| `incident` | 0–100 inclusive |
| `issue` | 101–200 inclusive |
| `planbaar-werk` | ≥ 201 |

The plan also calls priority unique and reusable: "de unieke prioriteit" and "Een waarde komt opnieuw beschikbaar bij afronding of prioriteitswijziging" (`software-factory-projectplan.md:56`). Enforce uniqueness among items whose `workflowStatus !== 'done'`; a `done` item's number is released. Duplicate active priority is `duplicate-priority` (exit 2). The comparator's `createdAt`/`id` tiebreak is defensive only; it should never be needed for valid data.

#### Comparator

```ts
export function compareQueueOrder(a: WorkItem, b: WorkItem): number {
  return (
    a.priority - b.priority ||
    a.createdAt.localeCompare(b.createdAt) ||
    a.id.localeCompare(b.id)
  );
}
```

Sort a **copy** of the loaded array; never rely on `readdir` order, which is filesystem-dependent.

#### Dependencies and cycles

- Build `byId` from every item in all four status directories.
- Every dependency ID must exist: otherwise `unknown-dependency` with the missing ID and the dependent item's file/line.
- Self-dependency is `dependency-cycle` with the one-node path.
- Detect cycles over **all** items, including `done` ones, because the plan says cycles are validation errors without qualification (`software-factory-projectplan.md:518`: "Onbekende afhankelijkheden en cycli zijn validatiefouten."). Use DFS with three colors (white/gray/black); on a gray target, report the cycle path in order, e.g. `A → B → C → A`.
- A dependency that is `wontfix` and not `done` is a warning (`dependency-wontfix`) because the dependent will never become eligible without operator action.

#### Blocker reporting

For each non-`done` item that is not eligible, collect stable reason codes:

| Code | Meaning |
|------|---------|
| `status:blocked` | `workflowStatus` is `blocked`. |
| `triage:needs-triage` / `triage:needs-info` / `triage:wontfix` | Triage is not `ready-for-agent`. |
| `approval-missing` | `approval` is `null`. |
| `approval-stale` | Computed revision differs from `approval.revision`. |
| `dependency-not-done:<id>` | A dependency exists but is not `done`; include its status. |
| `dependency-unknown:<id>` | A dependency does not exist (also a validation error). |
| `repository-unknown` | `repository` is not in config. |
| `priority-invalid` | Band mismatch or duplicate. |

D-07 requires the blockers and the affected IDs when idle. Return them all (the item count is small); do not truncate silently.

#### Queue output

`queue` is read-only and defaults to JSON (D-05). Shape:

```json
{
  "outputVersion": 1,
  "command": "queue",
  "ok": true,
  "data": {
    "state": "eligible",
    "next": {
      "id": "5bc84dd0-4699-4fc9-98c6-1941a731663f",
      "title": "Validate local work items",
      "priority": 210,
      "category": "planbaar-werk",
      "repository": "example-app",
      "revision": "sha256:..."
    },
    "counts": { "ready": 3, "inProgress": 0, "blocked": 1, "done": 4 },
    "blockers": [
      { "id": "...", "reasons": ["approval-stale", "dependency-not-done:..."] }
    ],
    "lease": null
  },
  "warnings": [],
  "errors": []
}
```

`state` is one of `eligible`, `idle`, `busy`, `needs-recovery`. `next` is `null` when idle or when recovery is required; it may still be populated when `busy` to show what would run next. An idle queue is `ok: true`, `state: "idle"`, exit **0** (D-08).
### Design 6: Run records

**Decision:** one **directory per run**, containing one append-only `events.jsonl`, a derived `receipt.json`, and runner artifacts. Never one file per work item: an item has many runs, and merging them into one file would require rewriting history.

```text
factory/runs/<runId>/
├── events.jsonl            # append-only; the audit trail and the authority
├── receipt.json            # written once at terminal; derived from events
└── artifacts/
    └── demo-report.md
```

`runId` is `crypto.randomUUID()`. The directory is created before `run.started`; an empty directory is an orphan and `reconcile` removes it after expiry.

#### Event format

One JSON object per line, UTF-8, LF-terminated:

```json
{"v":1,"at":"2026-11-22T21:00:00.000Z","type":"run.started","data":{"workItemId":"...","workItemRevision":"sha256:...","repository":"example-app","targetBranch":"main","runner":{"id":"demo","version":"1.0.0"},"attempt":1}}
```

| Type | Data | Terminal? |
|------|------|-----------|
| `run.started` | `workItemId`, `workItemRevision`, `repository`, `targetBranch`, `runner {id,version}`, `attempt` | no |
| `run.resumed` | `at`, `previousLastType`, `reason` | no |
| `run.artifact` | `path` (relative to the run dir), `sha256`, `bytes`, `mediaType` | no |
| `run.needs-human` | `question`, `summary` | yes |
| `run.completed` | `summary`, `artifacts[]` | yes |
| `run.failed` | `error {code,message}`, `summary` | yes |
| `run.interrupted` | `reason` (`lease-expired`, `revision-changed`, `operator-close`, `unknown-side-effects`), `detectedAt`, `detectedBy`, `lastEventType` | yes |

Append with `fs.promises.appendFile(path, line, { flag: 'a', flush: true })`. Node documents the `flush` option: "If true, the underlying file descriptor is flushed prior to closing it." Combined with `O_APPEND`, each event is a single write at the end of the file; a crash can tear the **last** line but cannot corrupt earlier lines.

Reader rule: parse lines in order. A malformed **last** line is treated as a torn write and ignored with a warning. A malformed non-last line is corruption (`run-log-corrupt`, exit 2). Never rewrite the file to fix it.

#### Receipt

`receipt.json` is written atomically when the run reaches a terminal event:

```json
{
  "runId": "...",
  "workItemId": "...",
  "workItemRevision": "sha256:...",
  "repository": "example-app",
  "targetBranch": "main",
  "runner": { "id": "demo", "version": "1.0.0" },
  "attempt": 1,
  "startedAt": "...",
  "endedAt": "...",
  "outcome": "succeeded",
  "summary": "Demo artifact written; no repository command was executed.",
  "artifacts": [
    { "path": "artifacts/demo-report.md", "sha256": "...", "bytes": 412, "mediaType": "text/markdown" }
  ]
}
```

The receipt is a convenience projection. If it is missing but the events are terminal, `reconcile` writes it from the events. If it exists and disagrees with the events, the events win and the receipt is rewritten; a mismatch is reported as a warning.

#### `deriveRunState`

```ts
export type RunState =
  | { phase: 'empty' }
  | { phase: 'open'; lastType: string }
  | { phase: 'terminal'; outcome: 'succeeded' | 'failed' | 'needs-human' | 'interrupted' };

export function deriveRunState(events: readonly RunEvent[]): RunState {
  if (events.length === 0) return { phase: 'empty' };
  const last = events[events.length - 1]!;
  switch (last.type) {
    case 'run.completed':   return { phase: 'terminal', outcome: 'succeeded' };
    case 'run.failed':      return { phase: 'terminal', outcome: 'failed' };
    case 'run.needs-human': return { phase: 'terminal', outcome: 'needs-human' };
    case 'run.interrupted': return { phase: 'terminal', outcome: 'interrupted' };
    default:                return { phase: 'open', lastType: last.type };
  }
}
```

#### Fields required for resumption

`run.started` must capture everything needed to decide whether the same run can continue:

- `runId` (directory name), `workItemId`, `workItemRevision`
- `repository`, `targetBranch`
- `runner.id`, `runner.version`
- `attempt`
- `startedAt` (the event's `at`)

The lease adds `owner {hostname,pid,user}`, `acquiredAt`, `expiresAt`. The runner probe adds the external-side-effect check.

#### How "interrupted" is recorded without rewriting history

Append `run.interrupted` with the reason and the last event type. The original `run.started` and any artifact events remain byte-for-byte unchanged. The receipt is then written with `outcome: "interrupted"`. This is why the run log is JSONL and not a single JSON document: a document would force a rewrite and lose the pre-interruption evidence.

### Design 7: CLI surface and JSON contract

**Decision:** one binary (`factory`), `util.parseArgs`, JSON envelope for `--json`, `queue` JSON by default, strict stdout/stderr separation, and four exit codes.

#### Commands

| Command | Mutates? | Purpose |
|---------|----------|---------|
| `factory new [--title <t>] [--category <c>] [--priority <n>] [--repository <key>]` | yes | Scaffold a valid item in `ready/` with a fresh UUID, `needs-triage`, and placeholder body. |
| `factory validate [<path>]` | no | Schema, body grammar, priority bands, dependencies, cycles, repository keys, approval drift. |
| `factory queue` | no | Next eligible item, counts, blockers, lease state. JSON by default. |
| `factory approve <id> [--yes]` | yes | Summary + confirmation; record approval for the current revision. |
| `factory run [--max-items <n>]` | yes | Reconcile, then drain eligible items sequentially until idle. |
| `factory status` | no | Lease, active run, counts, drift, recovery requirement, suggested next command. |
| `factory show <id>` | no | Item summary, computed revision, approval match, run references. |
| `factory runs [<runId>]` | no | List runs or replay one run's timeline. |
| `factory resume <runId> [--yes]` | yes | Take over an interrupted run when safe. |
| `factory close <runId> --outcome <interrupted\|failed\|abandoned> [--yes]` | yes | Append a terminal event, release the lease, block the item. |
| `factory reconcile` | yes | Apply the repair rules from Design 3. |

Global flags: `--json`, `--human` (only meaningful for `queue`/`status`), `--yes`, `--help`, `--version`. `--json` and `--human` together is a usage error (exit 2).

#### Envelope

Every `--json` command (and `queue` by default) prints exactly one JSON object to stdout:

```json
{
  "outputVersion": 1,
  "command": "queue",
  "ok": true,
  "data": { },
  "warnings": [],
  "errors": []
}
```

- `outputVersion` is the compatibility handle required by D-05.
- `ok` is `false` when `errors` is non-empty, even if the exit code is 3 (state refusal).
- `errors[]` entries: `{ "code", "message", "file?", "itemId?", "line?", "details?" }`.
- `warnings[]` entries have the same shape without `code` requirements.
- stdout carries only the envelope. Progress, prompts, and human diagnostics go to stderr. No color when `!stdout.isTTY` or `NO_COLOR` is set.

#### Exit codes

| Code | Meaning | Examples |
|------|---------|----------|
| `0` | Command completed, including idle and busy queue states | `queue` idle; `run` drained; `validate` valid |
| `1` | Unexpected internal or I/O error | `EXDEV` on rename, unreadable file, bug |
| `2` | Usage error or invalid data | unknown flag, schema error, unknown dependency, cycle, duplicate priority, missing confirmation |
| `3` | Refused by workflow state | live lease, unresolved run requiring `resume`/`close`, unsafe resume |

D-08 is explicit: an idle queue is exit `0`. A failed demo item does **not** make `run` exit non-zero; the failure is recorded in `data.outcomes`. `run` exits `3` only when it cannot safely start or recover work.

#### Human output examples

`factory queue --human` when idle:

```text
Queue: idle (ready 2, in-progress 0, blocked 1, done 3)
No eligible work item.
Blocked:
  abde03ab-3d2d-40b1-a5a8-95843b1ed437  "Fix login"   reasons: dependency-not-done:5bc84dd0, approval-stale
Next: none
```

`factory validate` human output: one line per error, `path:line: code: message`, then a summary. Exit 2 if any error.

#### Error codes

`missing-frontmatter`, `invalid-frontmatter-json`, `schema-invalid`, `unknown-field`, `invalid-uuid`, `duplicate-id`, `duplicate-priority`, `priority-category-mismatch`, `missing-section`, `duplicate-section`, `invalid-acceptance-criterion`, `placeholder-acceptance-criterion`, `unknown-repository`, `unknown-dependency`, `self-dependency`, `dependency-cycle`, `dependency-wontfix`, `status-directory-mismatch`, `invalid-transition`, `approval-stale`, `confirmation-required`, `lease-held`, `run-unresolved`, `run-log-corrupt`, `unsafe-resume`.

Codes are a contract: add new ones, never repurpose an existing one.

### Design 8: Demo runner interface

**Decision:** a tiny typed interface that receives data, not commands, and a demo implementation that writes one Markdown report. No `child_process` anywhere in `src/`.

```ts
export interface Artifact {
  path: string;        // relative to the run directory
  sha256: string;
  bytes: number;
  mediaType: string;
}

export type RunnerResult =
  | { outcome: 'succeeded'; summary: string; artifacts: Artifact[] }
  | { outcome: 'failed'; summary: string; error: { code: string; message: string }; artifacts: Artifact[] }
  | { outcome: 'needs-human'; summary: string; question: string; artifacts: Artifact[] };

export interface RunnerInput {
  runId: string;
  workItem: WorkItem;       // parsed and validated
  revision: string;         // approval-bound revision
  attempt: number;
  runDir: string;           // absolute factory/runs/<runId>
  artifactDir: string;      // absolute factory/runs/<runId>/artifacts
}

export interface RunnerContext {
  now(): Date;
  log(event: RunEventInput): Promise<void>; // append-only run log
  signal: AbortSignal;                      // timeout / cancellation
}

export interface RunnerProbe {
  state: 'not-started' | 'in-flight' | 'completed';
  artifacts?: Artifact[];
}

export interface Runner {
  readonly id: string;
  readonly version: string;
  run(input: RunnerInput, ctx: RunnerContext): Promise<RunnerResult>;
  probe(runId: string, runDir: string): Promise<RunnerProbe>;
}
```

Demo behavior:

1. Check `ctx.signal.aborted`; if aborted, return `failed` with `code: "timeout"`.
2. Write `artifacts/demo-report.md` atomically: run ID, work-item ID, revision, runner `demo@1.0.0`, attempt, timestamps, and the sentence "No repository command was executed."
3. Compute `sha256` and byte length of the report.
4. Return `succeeded` with the artifact.
5. `probe(runId, runDir)` returns `completed` if the report exists and its first line contains the run ID; otherwise `not-started`. The demo never returns `in-flight`.

Replaceability: a future Coder/OpenCode adapter implements the same `Runner` interface. It may add `probe` states (`in-flight`, provider resource IDs) but cannot change the orchestrator's contract: input is the parsed item + revision, output is a result + artifacts. The orchestrator never passes a shell command, repository path, or credential to the runner in Phase 1.

Timeout: `AbortSignal.timeout(config.runTimeoutSeconds * 1000)` plus `Promise.race` with a rejection timer, so a non-cooperative runner cannot hang the batch. The demo checks the signal; future runners must too.

Artifact containment: `path` must be relative, must not contain `..`, and must resolve inside `runDir` (`path.resolve(runDir, artifact.path).startsWith(runDir + path.sep)`). Reject otherwise.

Enforcement: `test/no-shell.test.ts` reads every `src/**/*.ts` and fails on `child_process`, `execSync`, `spawnSync`, `eval(`, or `new Function`. This is a cheap, verifiable boundary that survives refactors.

### Design 9: Multi-repository configuration (PROJ-01)

**Decision:** `factory/config.json` is the local, provider-neutral configuration. Work items reference a repository **key**, never a provider ID. Provider references are opaque annotations.

```json
{
  "schemaVersion": 1,
  "leaseTtlSeconds": 300,
  "heartbeatIntervalSeconds": 30,
  "runTimeoutSeconds": 60,
  "repositories": {
    "example-app": {
      "defaultBranch": "main",
      "policy": {
        "allowedCategories": ["incident", "issue", "planbaar-werk"],
        "requireApproval": true
      },
      "providers": {
        "git": null,
        "ci": null,
        "deploy": null,
        "tracker": null
      }
    },
    "second-app": {
      "defaultBranch": "trunk",
      "policy": {
        "allowedCategories": ["issue", "planbaar-werk"],
        "requireApproval": true
      },
      "providers": {
        "git": { "provider": "forgejo", "ref": "second-app" },
        "ci": null,
        "deploy": null,
        "tracker": null
      }
    }
  }
}
```

Validation:

- `schemaVersion` must be `1`.
- Repository keys match `^[a-z0-9][a-z0-9-]{0,63}$` (no path separators, no `..`).
- `defaultBranch` is a non-empty string without whitespace or `..`.
- `policy.allowedCategories` is a non-empty subset of the category enum.
- `providers` keys are a fixed slot set; each value is `null` or `{ provider: string, ref: string }`.
- `leaseTtlSeconds` ≥ 30, `heartbeatIntervalSeconds` ≥ 5 and < TTL, `runTimeoutSeconds` ≥ 1.
- An item's `repository` must exist in config. An item's `providerRefs` may reference a slot; if the slot is `null`, store the ref but emit a warning (`provider-not-configured`), never a workflow failure.

Why this satisfies PROJ-01 without becoming a provider-owned state store:

- Each repository has distinct policy and provider references, all in one local file.
- Provider references are never used for identity or eligibility; the queue uses only local fields.
- No network, no provider API, no remote state is read or written in Phase 1.
- The plan's `providers.yaml` is deferred to the integration phase; Phase 1 uses JSON to avoid a YAML dependency. When a provider is actually integrated, either keep JSON or introduce a YAML parser deliberately.

### Design 10: Validation and testing strategy

**Decision:** `node:test` over real temporary directories, an injected `Clock`, and crash states constructed on disk rather than mocked.

#### Test helper

```ts
// test/helpers/temp-factory.ts
export interface TempFactory {
  root: string;                    // mkdtemp root
  factory: string;                 // root/factory
  paths: FactoryPaths;
  clock: MutableClock;
  writeItem(item: WorkItemInput): Promise<string>;
  writeRaw(relativePath: string, contents: string): Promise<string>;
  cleanup(): Promise<void>;
}

export async function createTempFactory(): Promise<TempFactory> { /* ... */ }
```

Each test gets a fresh `mkdtemp` root; `t.after` removes it recursively. Never share a fixture directory between tests; `node --test` runs files in parallel processes by default.

#### Clock injection

```ts
export interface Clock { now(): Date; }
export class MutableClock implements Clock {
  constructor(private current: Date) {}
  now(): Date { return new Date(this.current); }
  set(iso: string): void { this.current = new Date(iso); }
  advanceSeconds(seconds: number): void { this.current = new Date(this.current.getTime() + seconds * 1000); }
}
```

Lease expiry tests advance the clock; no `sleep`, no `mock.timers` required. (`node:test` mock timers support `Date` and are a fallback if a stray `Date.now()` appears; verified on the local runtime.)

#### Crash and interruption tests

Do not try to kill a process mid-syscall. Construct the exact on-disk state a crash leaves, then assert the classification and repair:

1. Lease exists, no run directory → `orphan-lease`; after TTL, `reconcile` removes it.
2. Run directory exists, zero events → `empty`; `reconcile` removes it.
3. `run.started` exists, item still `ready` → resume re-applies `ready → in-progress`.
4. `run.started` + artifact, no terminal event → `probe` returns `completed`; `reconcile` appends the terminal event.
5. Terminal event exists, item `in-progress` → `reconcile` moves it to `done`/`blocked`.
6. Lease expired, PID dead → `status` reports `needs-recovery`; `run` exits 3 or resumes per the decision tree.
7. Lease expired, PID alive → `held-alive`; refuse.
8. Two files with the same ID → `duplicate-id`; no destructive action.
9. Torn last JSONL line → reader ignores it with a warning; earlier events still replay.
10. Item moved but frontmatter stale → `reconcile` moves it back per frontmatter.

For a true process-level test, spawn a fixture script that acquires the lease, appends `run.started`, and calls `process.exit(70)`, then invoke `factory status`/`factory run` in a second process. This exercises the real file layout without adding test-only branches to production code.

#### Concurrency test (WF-06)

Spawn N (e.g., 8) child processes that all call `acquireLease` against the same temp factory, synchronized by a barrier file. Assert exactly one succeeds and the others get `EEXIST`/`LeaseHeldError`. Repeat a few times. This tests the actual `O_EXCL` behavior, not a mock.

#### Determinism and offline guarantees

- Sort every directory listing before use; never depend on `readdir` order.
- Fixed clock in unit tests; fixed UUIDs in fixtures where the ID matters.
- No network imports: `test/no-network.test.ts` scans `src/**/*.ts` for `node:http`, `node:https`, `node:net`, `node:dns`, and `fetch(`.
- No shell imports: `test/no-shell.test.ts` as above.
- `TZ=UTC`, `LC_ALL=C` in CLI tests.
- CLI tests spawn `process.execPath` with `src/cli.ts` and an absolute temp `--root` (or `cwd`), then parse stdout as JSON.

#### Test file map

| File | Covers |
|------|--------|
| `work-item.test.ts` | Required fields, unknown fields, UUID format, enum values, size limits. |
| `frontmatter.test.ts` | Delimiters, BOM, CRLF, invalid JSON, missing closing delimiter. |
| `body.test.ts` | Required/duplicate/missing sections, fenced headings, criterion grammar, line numbers. |
| `revision.test.ts` | Normalization, stability, formatting-only edits, criterion edits, repository/branch edits, length-prefix collisions. |
| `priority.test.ts` | Bands, boundaries (0/100/101/200/201), uniqueness among non-done, reuse after done. |
| `dependencies.test.ts` | Unknown, self, cycle path, all-done, blocked dependency, wontfix warning. |
| `queue.test.ts` | Eligibility predicate, comparator, idle/blocked/busy states, blocker codes. |
| `atomic-file.test.ts` | Temp cleanup, rename overwrite, fsync calls (spy), EXDEV message. |
| `transitions.test.ts` | Allowed/invalid transitions, move + rewrite, mismatch detection. |
| `lease.test.ts` | Acquire twice, heartbeat precedence, release order, PID classification. |
| `run-log.test.ts` | Append/flush, replay, torn last line, terminal derivation, receipt. |
| `recovery.test.ts` | The ten crash states above; resume vs replace. |
| `config.test.ts` | Repository keys, policy validation, provider refs, unknown repository. |
| `no-shell.test.ts` / `no-network.test.ts` | Static boundary checks. |
| `cli.test.ts` | Commands, envelope, exit codes, stdout/stderr, `--json`/`--human`, `--yes`. |

### Suggested implementation sequence (for the planner)

1. **Toolchain + format:** `package.json`, `package-lock.json`, `tsconfig.json`, `.nvmrc`, `.gitignore`, `factory/config.json`, `factory/WORKFLOW.md`, the JSON Schema, `src/domain/{work-item,frontmatter,body,revision}.ts`, and their tests.
2. **State adapters:** `src/state/atomic-file.ts`, `work-item-store.ts`, `transitions.ts`; crash-window tests.
3. **Queue + read/approve commands:** `priority`, `dependencies`, `queue`, `validate`, `approve`, `new`, `show`; CLI envelope and exit codes.
4. **Lease + runs:** `lease.ts`, `run-log.ts`, runner contract, demo runner, `run`, `resume`, `close`, `status`, `reconcile`; recovery and concurrency tests.
5. **Hardening:** `no-shell`/`no-network` tests, full CLI integration, README/`WORKFLOW.md` documentation, phase-gate run on Node 24.22.3.

Each plan is independently verifiable; plans 1–3 are pure/read-only and can land before the lease exists.
## Common Pitfalls

### Pitfall 1: Assuming `rename` is a filesystem-wide transaction
**What goes wrong:** The code moves a file and rewrites its frontmatter, then assumes no intermediate state is visible.
**Why it happens:** `rename` is atomic for the *name replacement*, not for a two-step content update. Linux `rename(2)` explicitly notes "there will probably be a window in which both oldpath and newpath refer to the file being renamed" during the operation, and a crash between the move and the rewrite leaves a stale field.
**How to avoid:** Treat the move and the rewrite as two steps with a documented repair rule; make `reconcile` the only repairer; never copy.
**Warning signs:** A queue run sees an item whose directory and `workflowStatus` disagree; a test that only checks the happy path.

### Pitfall 2: Forgetting the directory fsync
**What goes wrong:** The file content survives a crash but the directory entry does not, so the item "disappears" after a power loss.
**Why it happens:** `fs.writeFile` and even `fsync` on the file do not guarantee the directory entry. `fsync(2)` says an explicit fsync on a directory descriptor is needed.
**How to avoid:** `fsyncDirectory` after every `rename` and `unlink` in `state/`, `work-items/*/`, and `runs/<id>/`.
**Warning signs:** Durability tests pass in-process but fail after a VM reset; no `open(dir, 'r')` in the code.

### Pitfall 3: Treating lease expiry as liveness
**What goes wrong:** An expired lease starts a second run while the first process is paused but alive; two writers mutate the same item.
**Why it happens:** `expiresAt < now` is cheap and looks authoritative, but it measures heartbeat silence, not process death.
**How to avoid:** Classify owner PID (same host), heartbeat, and runner probe; refuse when uncertain; resume the same run ID only when safe; append `run.interrupted` before a replacement.
**Warning signs:** `run` acquires the lease immediately after an expiry without reading the run; no PID/host in the lease.

### Pitfall 4: Hashing raw file bytes
**What goes wrong:** Every editor save changes line endings or trailing whitespace, so approvals invalidate constantly and the operator starts re-approving without reading.
**Why it happens:** The hash is computed over `readFile()` output instead of the normalized contract fields.
**How to avoid:** Normalize scope/out-of-scope/criteria; hash only those plus repository/branch; test formatting-only edits.
**Warning signs:** `revision.test.ts` has no CRLF/trailing-space case; approvals invalidate after a no-op edit.

### Pitfall 5: Hashing only frontmatter, or only the body
**What goes wrong:** Scope lives in the body but the hash covers only `acceptanceCriteria` in frontmatter (or vice versa), so a scope edit slips through.
**Why it happens:** The format has two layers and the hash implementation reads one of them.
**How to avoid:** A single `computeRevision` function takes the parsed item (both layers) and is the only hash entry point.
**Warning signs:** Two hash functions; a field added to the schema but not to the revision payload.

### Pitfall 6: YAML implicit typing (if YAML is chosen later)
**What goes wrong:** Depending on the parser's YAML schema version, `priority: 0200` can parse as 128 (YAML 1.1 octal) or 200, `owner: no` can parse as `false` (1.1) or the string `no` (1.2), and unquoted timestamps become `Date` objects.
**Why it happens:** YAML implicit scalar resolution differs between 1.1 and 1.2 and between parser defaults.
**How to avoid:** JSON frontmatter in Phase 1. If YAML is ever introduced, use a 1.2 parser with a strict schema and no implicit types.
**Warning signs:** A priority that is not an integer; a string field that is a boolean.

### Pitfall 7: Prototype pollution through parsed JSON
**What goes wrong:** A frontmatter object with `__proto__` or `constructor` alters validation or defaults.
**Why it happens:** `JSON.parse` creates own properties, but merging with `Object.assign` or spread into a target can trigger setters.
**How to avoid:** Reject unknown fields; read each field explicitly; use `Object.hasOwn`; never merge untrusted objects into defaults.
**Warning signs:** A generic `merge(defaults, parsed)` helper.

### Pitfall 8: Path traversal through IDs, repository keys, or artifact paths
**What goes wrong:** A crafted `id` or artifact `path` writes outside `factory/`.
**Why it happens:** Paths are built from file content.
**How to avoid:** UUID-validate IDs; regex-validate repository keys; require artifact paths to be relative and resolve inside the run directory.
**Warning signs:** `path.join(root, item.id)` without validation; `..` accepted.

### Pitfall 9: `node --test` executes helper files under `test/`
**What goes wrong:** `test/helpers/temp-factory.ts` is discovered as a test file because the default pattern includes `**/test/**/*.{cts,mts,ts}`.
**Why it happens:** Node 24's default discovery includes any `.ts` under a `test/` directory, not only `*.test.ts`.
**How to avoid:** Run `node --test "test/**/*.test.ts"` (quoted) and keep fixture **data** in `.json`/`.md`.
**Warning signs:** Helper files appear as passing "tests"; side effects run twice.

### Pitfall 10: Type-stripping syntax that Node cannot erase
**What goes wrong:** `enum`, parameter properties, runtime `namespace`, decorators, or a missing `type` keyword on a type-only import fail at runtime.
**Why it happens:** Node replaces types with whitespace; it does not transform syntax that requires code generation.
**How to avoid:** `erasableSyntaxOnly: true`, `verbatimModuleSyntax: true`, `import type` for types, `.ts` extensions in imports, `"type": "module"`.
**Warning signs:** `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`; `TS1294`; a runtime error about a missing export.

### Pitfall 11: TypeScript 7's changed defaults
**What goes wrong:** `process` is "not found" or the output layout changes because TS 7 defaults `types` to `[]` and `rootDir` to `./`.
**Why it happens:** TS 7 (native port) changed these defaults from earlier versions.
**How to avoid:** Set `"types": ["node"]` explicitly; set `rootDir` or omit it deliberately; verify with a real `tsc -p tsconfig.json`.
**Warning signs:** `TS2591: Cannot find name 'process'`.

### Pitfall 12: Non-deterministic directory order
**What goes wrong:** Queue selection or validation output changes between runs on different filesystems.
**Why it happens:** `readdir` order is not guaranteed.
**How to avoid:** Sort by the comparator before selecting; sort error lists by file then line.
**Warning signs:** Flaky queue tests; different "next" item on macOS vs Linux.

### Pitfall 13: Mutating on inspection
**What goes wrong:** `queue` or `status` repairs drift or releases a lease, surprising scripts and hiding the state the operator wanted to inspect.
**Why it happens:** The repair logic is convenient to call from every command.
**How to avoid:** Read-only commands return the condition; only `reconcile` writes.
**Warning signs:** A read command that calls `writeFileAtomic`.

### Pitfall 14: Blocking on human input inside a run
**What goes wrong:** The demo waits for an answer, holding the global slot indefinitely.
**Why it happens:** The runner treats a question as a prompt instead of a result.
**How to avoid:** Return `needs-human`; append the terminal event; block the item; release the lease.
**Warning signs:** A `readline` call inside `runners/`.

### Pitfall 15: Local time and clock skew
**What goes wrong:** `expiresAt` comparisons fail around DST or between processes with different clocks.
**Why it happens:** Mixing `Date` local formatting with ISO strings, or using wall time for durations.
**How to avoid:** Store ISO 8601 UTC; compare `Date.parse` values; use one clock per process; document that cross-host lease comparison is refused.
**Warning signs:** `toLocaleString()` in persisted data.

## Code Examples

Verified patterns from the sources above. The design sections contain the full implementations; these are the small, reusable pieces.

### CLI parsing and envelope

```ts
import { parseArgs } from 'node:util';

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  allowPositionals: true,
  options: {
    json: { type: 'boolean', default: false },
    human: { type: 'boolean', default: false },
    yes: { type: 'boolean', short: 'y', default: false },
  },
});

if (values.json && values.human) {
  process.stderr.write('--json and --human are mutually exclusive\n');
  process.exit(2);
}
```

`parseArgs` returns a null-prototype object, which also avoids accidental prototype lookups for flag names. [CITED: nodejs.org/docs/latest-v24.x/api/util.html]

### Durable JSONL append

```ts
import { appendFile } from 'node:fs/promises';

export async function appendEvent(path: string, event: RunEvent): Promise<void> {
  const line = `${JSON.stringify(event)}\n`;
  await appendFile(path, line, { flag: 'a', flush: true });
}
```

`flush: true` flushes the descriptor before close (documented `fdatasync` semantics — file data, not metadata); `flag: 'a'` uses `O_APPEND`, so concurrent appends cannot overwrite each other's offset. [CITED: nodejs.org/docs/latest-v24.x/api/fs.html]

### Typed constants without enums

```ts
export const CATEGORIES = ['incident', 'issue', 'planbaar-werk'] as const;
export type Category = (typeof CATEGORIES)[number];

export const WORKFLOW_STATUSES = ['ready', 'in-progress', 'blocked', 'done'] as const;
export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number];

export const TRIAGE_STATUSES = ['needs-triage', 'needs-info', 'ready-for-agent', 'wontfix'] as const;
export type TriageStatus = (typeof TRIAGE_STATUSES)[number];
```

This is erasable syntax (no `enum`) and gives the validator runtime arrays to compare against the JSON Schema.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `ts-node` / `tsx` for a CLI | Node native type stripping (`node src/cli.ts`) | Node 23 default, stable in 24 | No build step, no source maps, no transform dependency; only erasable syntax. |
| `fs.writeFile` + hope | temp → `sync()` → `rename` → dir `sync()` | POSIX semantics, always true | Crash-safe replacement; a few more syscalls per mutation. |
| YAML frontmatter + `js-yaml` | JSON frontmatter (valid YAML 1.2 subset) | This design | Zero dependencies, no implicit typing, still readable by YAML tools. |
| `proper-lockfile` / PID files | `open('wx')` + separate heartbeat | This design | One atomic syscall; stale detection is explicit, not library magic. |
| Jest / Vitest | `node:test` | Node 18+, mature in 24 | Built-in, `.ts` discovery, mock timers, no transform config. |
| `moment` / `date-fns` | `Date` + injected `Clock` | — | No dependency; testable time. |

**Deprecated/outdated in this context:**
- **YAML for machine state:** avoid until a real provider config needs it; then choose a 1.2 parser deliberately.
- **`copyFile` for moves:** explicitly non-atomic in the Node docs; use `rename`.
- **`fs.access` before open:** TOCTOU; open and handle the error.
- **`process.argv` slicing by hand:** use `parseArgs`.
- **Boolean approvals:** replace with a revision hash.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The operator accepts scope/out-of-scope/criteria as Markdown body sections rather than JSON string arrays in frontmatter. | Design 1 | Medium: the parser, fixtures, and approval summary would need rework; the data model stays the same. |
| A2 | `triageStatus` uses `needs-triage`, `needs-info`, `ready-for-agent`, `wontfix`. The plan does not define triage values. | Design 1, Design 5 | Low: enum values are easy to change before data exists; tests pin them. |
| A3 | The approval hash includes `repository` and `targetBranch`, not only scope + criteria. | Design 2 | Low: a narrower hash is a one-line change, but the approval would not notice a repository change. |
| A4 | Defaults: lease TTL 300 s, heartbeat 30 s, run timeout 60 s. | Design 4, Design 9 | Low: config values; no data migration. |
| A5 | The `@types/node` `SUS` verdict is a false positive caused by the latest dist-tag's publish date; the pinned `24.19.2` is legitimate. | Package Legitimacy Audit | Low: the checkpoint costs one confirmation; the package is from DefinitelyTyped. |
| A6 | A successful demo run moves the item to `done`; no separate human acceptance gate exists in Phase 1. | Design 3, Design 6 | Medium: if the operator wants a "review before done" step, the transition table and demo outcome change. |
| A7 | `run` exits 0 when the batch completes even if individual items failed; failures are in `data.outcomes`. | Design 7 | Low: scripts can read the JSON; a flag can change it later. |
| A8 | `## Problem` is required for completeness but is not part of the approval hash. | Design 1, Design 2 | Low: if problem text is considered binding, add it to the revision payload and bump the format. |
| A9 | PID-based liveness is valid because the factory runs on one host; cross-host leases are refused. | Design 4 | Low for Phase 1; revisit when workspaces run on other VMs. |

**If this table were empty:** every claim would be verified or cited. It is not empty because A1–A9 are design choices the plan does not settle.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js 24.22.3 | Runtime, tests, phase gate | ✗ (only 26.13.1 installed) | v26.13.1 | Install 24.22.3 from the official tarball, or run on 26.13.1 and record the deviation |
| npm 11.19.1 | `npm ci`, lockfile | ✗ (11.20.0 installed) | 11.20.0 | Bundled with Node 24.22.3 once installed |
| TypeScript 7.0.2 | `npm run check` | ✗ globally | — | `npm ci` installs it as a devDependency |
| `@types/node` 24.19.2 | Type checking | ✗ globally | — | `npm ci` installs it as a devDependency |
| `node:test` | Tests | ✓ | built-in | — |
| git | Versioning, phase commits | ✓ | 2.54.0 (Apple Git-157) | — |
| Local filesystem | `O_EXCL`, `rename`, fsync | ✓ | APFS (local, journaled) | — |
| Version manager (`nvm`/`fnm`/`volta`/`mise`) | Installing Node 24 | ✗ | — | Official macOS `.pkg` or tarball |
| Network (install time) | `npm ci` | ✓ | — | Not needed at runtime |

**Missing dependencies with no fallback:**
- None that block design; the CLI can be developed on Node 26.13.1.

**Missing dependencies with fallback:**
- Node 24.22.3 → install it before the phase gate, or run the gate on 26.13.1 and record the deviation in VERIFICATION.md.
- npm 11.19.1 → comes with Node 24.22.3; npm 11.20.0 is close enough for development.

**Filesystem requirement:** `factory/` must be on a local filesystem. `open(2)` documents that `O_EXCL` locking is racy on NFS without NFSv3+, and `rename` fails with `EXDEV` across mounts. The current checkout is APFS on the local disk; the Proxmox target will be ext4/xfs.

## Validation Architecture

> `workflow.nyquist_validation` is `true` in `.planning/config.json` (line 25), so this section is required.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `node:test` (Node 24.22.3 built-in) + `node:assert/strict` |
| Config file | none — `tsconfig.json` is only for type checking; `node --test` needs no config |
| Quick run command | `npm run check && node --test test/revision.test.ts` (per task; substitute the relevant file) |
| Full suite command | `npm test` → `node --test "test/**/*.test.ts"` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| WF-01 | Create a canonical item offline; a complete item validates | integration | `node --test test/cli.test.ts` | ❌ Wave 0 |
| WF-02 | All required fields present; unknown fields rejected; run references recorded | unit | `node --test test/work-item.test.ts test/frontmatter.test.ts` | ❌ Wave 0 |
| WF-03 | Approval revision matches; scope/criteria edit invalidates; formatting edit does not | unit | `node --test test/revision.test.ts test/queue.test.ts` | ❌ Wave 0 |
| WF-04 | Allowed transitions only; move + rewrite; mismatch detected and repaired | unit + integration | `node --test test/transitions.test.ts test/atomic-file.test.ts` | ❌ Wave 0 |
| WF-05 | Priority order, bands, uniqueness, dependency completion, unknown deps, cycles | unit | `node --test test/priority.test.ts test/dependencies.test.ts test/queue.test.ts` | ❌ Wave 0 |
| WF-06 | Exactly one lease under concurrent acquisition; second run refused | integration | `node --test test/lease.test.ts` | ❌ Wave 0 |
| WF-07 | Ten crash states classify and repair; resume reuses run ID; replacement gets a new one | integration | `node --test test/recovery.test.ts test/run-log.test.ts` | ❌ Wave 0 |
| WF-08 | No network or shell imports; validate/queue/run work in a temp factory | static + integration | `node --test test/no-network.test.ts test/no-shell.test.ts test/cli.test.ts` | ❌ Wave 0 |
| PROJ-01 | Multiple repositories with distinct policy/provider refs; unknown repo rejected | unit | `node --test test/config.test.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm run check && node --test test/<changed-area>.test.ts`
- **Per wave merge:** `npm test`
- **Phase gate:** `npm run check && npm test` on Node 24.22.3; all green before `/gsd-verify-work`.

### Wave 0 Gaps

- [ ] `package.json`, `package-lock.json`, `tsconfig.json`, `.nvmrc`, `.gitignore` — toolchain and pins.
- [ ] `test/helpers/temp-factory.ts` — `mkdtemp` factory builder with `MutableClock`.
- [ ] `test/fixtures/*.json` and `*.md` — valid item, invalid item, cycle graph, torn JSONL (no `.ts` fixtures).
- [ ] `src/util/clock.ts` — `Clock` interface and `MutableClock`.
- [ ] `factory/config.json` and `factory/WORKFLOW.md` — minimal valid workflow.
- [ ] `factory/schemas/work-item.schema.json` — contract file for the parity test.

## Security Domain

`security_enforcement` is `true` and `security_asvs_level` is `1` in `.planning/config.json`.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Single local operator; no login surface in Phase 1. |
| V3 Session Management | no | No sessions; CLI process lifetime only. |
| V4 Access Control | partial | Filesystem permissions (0600 lease, 0644 items) and lease ownership; `approvedBy` is self-asserted, not auth. |
| V5 Input Validation | yes | Strict frontmatter schema, body grammar, UUID/repository-key regexes, path containment, size limits. |
| V6 Cryptography | yes | `node:crypto` `randomUUID` and `sha256`; no hand-rolled crypto. |
| V7 Error Handling & Logging | yes | Stable error codes; no secrets in logs; artifact paths redacted only if they contain secrets (they should not). |
| V12 Files and Resources | yes | Local files only; temp files cleaned; no upload surface. |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Command injection via work-item content | Tampering / Elevation | No `child_process` in `src/`; runner receives data, not commands; `no-shell.test.ts`. |
| Path traversal via `id`, repository key, or artifact path | Tampering | UUID validation; `^[a-z0-9][a-z0-9-]{0,63}$`; resolve artifact paths inside the run dir. |
| Prototype pollution via `JSON.parse` | Tampering | Reject unknown fields; read fields explicitly; no object merging. |
| Symlink swap at the lease or item path | Tampering | `O_EXCL` fails on an existing symlink; `rename` replaces the link, not its target; never follow a link to write. |
| TOCTOU on existence checks | Tampering | Open with `wx` and handle `EEXIST`; never `access()` then `open()`. |
| Denial of service via huge item files | DoS | 64 KiB frontmatter / 1 MiB body limits; reject before parsing. |
| Duplicate writer via expired lease | Tampering / Repudiation | Expiry is classification, not permission; PID + probe + revision checks. |
| Approval forgery | Repudiation | Single-user local system; `approvedBy` is audit, not proof; the decisions log is append-only. |
| Sensitive data in run artifacts | Information Disclosure | Demo artifact contains only IDs, revision, and a fixed sentence; future runners must redact. |

## Sources

### Primary (HIGH confidence)

- [Node.js v24 Modules: TypeScript](https://nodejs.org/docs/latest-v24.x/api/typescript.html) — default type stripping, erasable-only syntax, required `type` imports, mandatory `.ts` extensions, no `tsconfig.json` paths, `.tsx` unsupported.
- [Node.js v24 File system](https://nodejs.org/docs/latest-v24.x/api/fs.html) — `rename`, `fsync`, `open` flags (`wx`/`O_EXCL`), `appendFile` `flush`, `FileHandle.sync`, `copyFile` non-atomicity, network-FS caveat.
- [Node.js v24 Test runner](https://nodejs.org/docs/latest-v24.x/api/test.html) — default discovery including `**/*.test.{cts,mts,ts}` and `**/test/**/*.{cts,mts,ts}`, `--test-concurrency`, `describe`/`it`, hooks, `mock.timers` including `Date`.
- [Node.js v24 `util.parseArgs`](https://nodejs.org/docs/latest-v24.x/api/util.html) — option types, positionals, null-prototype result.
- [Linux `rename(2)`](https://man7.org/linux/man-pages/man2/rename.2.html) — atomic replacement, the both-names window, `EXDEV`.
- [POSIX `rename()`](https://pubs.opengroup.org/onlinepubs/9799919799/functions/rename.html) — the standardized replacement guarantee.
- [Linux `fsync(2)`](https://man7.org/linux/man-pages/man2/fsync.2.html) — file fsync does not flush the directory entry.
- [JSON Schema 2020-12 Validation](https://json-schema.org/draft/2020-12/json-schema-validation) — `format` is annotation by default; `format-assertion` is optional; `uuid` is a defined format.
- [Announcing TypeScript 7.0](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/) — 2026-07-08 native port, no compiler API until 7.1, `@typescript/typescript6` compatibility package, changed `rootDir`/`types` defaults.
- npm registry queries (`npm view typescript@7.0.2`, `npm view @types/node@24.19.2`, download counts) — exact versions and publish dates.
- Local probes on 2026-11-22 (Node 26.13.1, macOS APFS): directory `fsync` succeeds; `rename` overwrites an existing file; `open('wx')` fails with `EEXIST`; `process.kill(999999, 0)` returns `ESRCH`; `node --test` discovers `.test.ts`; `mock.timers` mocks `Date`; TS 7.0.2 rejects `enum` under `erasableSyntaxOnly` and requires `types: ["node"]`.

### Secondary (MEDIUM confidence)

- `software-factory-projectplan.md` §2, §6, §10, §11 Phase 1, §13 — the authoritative workflow vocabulary, priority bands, queue rules, recovery rule, and acceptance criteria. Verbatim quotes are cited with line numbers in the design sections.
- `.planning/research/ARCHITECTURE.md` — canonical files with replaceable adapters; claim/lease plus verify-before-retry; the recommended structure.
- `.planning/research/PITFALLS.md` — pitfall #6 (expired lease treated as proof the old run stopped) and #3 (approval reused for changed content).
- `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/PROJECT.md`, `.planning/config.json` — scope, phase mapping, constraints, and workflow settings.

### Tertiary (LOW confidence)

- None relied on for a design decision. The triage enum and default timers are design choices, listed in the Assumptions Log.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — exact versions verified on npm; TS 7 behavior verified by compiling; Node 24 behavior verified from official docs.
- Architecture: HIGH — atomic-write, lease, queue, and recovery mechanics follow POSIX/Node semantics and the plan's explicit rules.
- Workflow shape: MEDIUM — the plan fixes the vocabulary and gates, but the body-section grammar, triage enum, and hash scope are design choices the operator has not ratified (A1–A3, A6, A8).
- Pitfalls: HIGH — each is grounded in a documented syscall/API behavior or the project's own pitfall research.

**Research date:** 2026-11-22
**Valid until:** 2027-01-15 for Node/TypeScript mechanics; re-verify TypeScript 7.1 (API changes) and Node 24 patch releases before implementation if the date slips.

## Open Questions (RESOLVED)

1. **JSON frontmatter or YAML?**
   - What we knew: the plan requires local Markdown with machine-readable status; `.planning/research/ARCHITECTURE.md:46` already specifies "Versioned local Markdown plus JSON frontmatter"; YAML would need a parser.
   - Resolution: **JSON frontmatter**, because it is dependency-free, has no implicit typing, and is a valid YAML 1.2 subset. Scope and acceptance criteria live in Markdown body sections, not in JSON strings.

2. **Where do scope and acceptance criteria live?**
   - Resolution: required body sections `## Scope`, `## Out of Scope`, `## Acceptance Criteria`, plus `## Problem`; the frontmatter holds only machine fields. This keeps direct Markdown authoring usable (D-01) and gives the hash a stable input.

3. **What exactly invalidates approval?**
   - Resolution: a change to `repository`, `targetBranch`, `## Scope`, `## Out of Scope`, or any acceptance criterion. Formatting-only edits do not. Title, category, priority, owner, dependencies, provider refs, and checkbox state do not. The hash format is versioned (`sf-revision-v1`).

4. **Where does the revision hash live, and how is drift detected?**
   - Resolution: `approval.revision` in frontmatter, `run.started` in the run log, and the append-only decisions log. Every load recomputes the hash; `validate`/`queue`/`status` report `approval-stale`; `reconcile` blocks the item and clears approval.

5. **How are status and directory kept consistent?**
   - Resolution: `rename` first, then atomic frontmatter rewrite. A crash leaves a detectable mismatch; `reconcile` repairs it with frontmatter as authority, after terminal-run finalization. Never copy; fail on `EXDEV`.

6. **What is the global lease design, and why not auto-resume on expiry?**
   - Resolution: `open(lease.json, 'wx')` with a separate heartbeat file; expiry triggers classification (PID, host, run state, probe), never acquisition. Resume reuses the run ID only when the revision is unchanged, the owner is dead, and the probe is conclusive; otherwise append `run.interrupted` and start a replacement.

7. **Does "lowest-priority eligible item" mean the lowest numeric value?**
   - Resolution: **yes** — the lowest numeric `priority` value (highest importance), then `createdAt`, then `id`. `0` runs before `201`. This is the plan's "Lagere waarden worden eerder uitgevoerd" and "laagste unieke prioriteitsnummer".

8. **How are dependencies and cycles handled?**
   - Resolution: every dependency must exist and be `done`; unknown dependencies, self-dependencies, and any cycle are validation errors; DFS reports the cycle path; a blocked dependency keeps its dependents waiting without consuming the slot.

9. **One run file per item or per run?**
   - Resolution: one **directory per run** with append-only `events.jsonl`, a derived `receipt.json`, and artifacts. Items store run IDs only. Interruption is a new event, never a rewrite.

10. **What is the CLI and JSON contract?**
    - Resolution: `factory` binary; `queue` JSON by default; every `--json` command returns `{outputVersion, command, ok, data, warnings, errors}`; stdout is machine output only; exit 0 for success/idle, 1 internal, 2 usage/invalid data, 3 state refusal.

11. **What is the demo runner boundary?**
    - Resolution: a typed `Runner` interface receiving the parsed item, revision, run ID, and artifact directory; it returns a result and artifacts. The demo writes one Markdown report and never imports `child_process`; static tests enforce the boundary.

12. **How does one factory configure multiple repositories without becoming provider-owned?**
    - Resolution: `factory/config.json` maps repository keys to `defaultBranch`, `policy`, and opaque `providers` references. Items reference the key; provider refs never affect identity or eligibility; no network or provider state in Phase 1.

13. **How is the filesystem-heavy CLI tested deterministically and offline?**
    - Resolution: `node:test` with `mkdtemp` per test, injected `MutableClock`, constructed crash states, a real concurrent-lease test, static no-shell/no-network scans, sorted directory reads, and `TZ=UTC`/`LC_ALL=C` for CLI tests.

14. **What happens when the pinned Node 24.22.3 is not installed?**
    - Resolution: the design is compatible with Node 26.13.1 for development, but the phase gate must run on 24.22.3. Install it from the official tarball (no version manager is present) or record the deviation explicitly in VERIFICATION.md; do not silently change the pin.

