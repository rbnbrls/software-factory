# Phase 1: Local Work Items and Queue — Pattern Map

**Mapped:** 2026-11-22
**Files analyzed:** 57 (files + fixture groups) across toolchain, `factory/`, `src/`, `test/`
**Analogs found:** 0 / 57

> **Greenfield notice.** The working tree contains only documentation. `git status` shows an earlier
> `src/`, `test/`, `package.json`, and `factory/` as **deleted**; the operator explicitly chose to build
> fresh and ignore that history. Do **not** mine those deleted blobs for patterns. Every new file's
> authoritative pattern source is `.planning/phases/01-local-work-items-and-queue/01-RESEARCH.md`
> (tracked). Excerpts below cite that file's design sections; the planner should copy them verbatim into
> plan actions.

## File Classification

| New File / Group | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `package.json`, `package-lock.json`, `tsconfig.json`, `.nvmrc`, `.gitignore` | config | n/a (static) | none | none |
| `factory/WORKFLOW.md`, `factory/config.json`, `factory/schemas/work-item.schema.json` | config/contract | transform (validate) | none | none |
| `src/cli.ts` | route/dispatcher | request-response | none | none |
| `src/commands/{validate,queue,approve,new,run,status,show,runs,resume,close,reconcile}.ts` | controller (application service) | request-response + file-I/O | none | none |
| `src/domain/{work-item,frontmatter,body,revision,priority,dependencies,queue,transitions}.ts` | service (pure domain) | transform | none | none |
| `src/state/atomic-file.ts` | utility (fs adapter) | file-I/O | none | none |
| `src/state/{work-item-store,lease,run-log}.ts` | service (state adapter) | file-I/O + event-driven | none | none |
| `src/runners/{contract,demo,registry}.ts` | provider/adapter | request-response (in-process) | none | none |
| `src/config/config.ts` | config loader | transform | none | none |
| `src/util/{clock,errors,output}.ts` | utility | n/a / transform | none | none |
| `test/helpers/temp-factory.ts` | test helper | file-I/O | none | none |
| `test/fixtures/*.json`, `*.md` | test data | n/a | none | none |
| `test/*.test.ts` (16 files) | test | unit/integration | none | none |

**Implied but unassigned:** `FactoryPaths` is referenced by `state/lease.ts` and
`test/helpers/temp-factory.ts` in RESEARCH but no file owns it. Planner should place it explicitly
(e.g. `src/state/paths.ts` or `src/config/paths.ts`) rather than letting executors invent one per module.

---

## Pattern Assignments

### 1. Toolchain & static config (config, static)

**Source:** 01-RESEARCH.md §Standard Stack (lines 105-153), §Recommended Project Structure (210-289), Pitfalls 10-11 (1357-1367).

Key constraints to encode literally:
- `"type": "module"`; `.ts` extensions in imports; `import type` for type-only imports.
- `tsconfig.json`: `noEmit: true`, `erasableSyntaxOnly: true`, `verbatimModuleSyntax: true`, `"types": ["node"]` (TS 7 defaults `types` to `[]`), deliberate `rootDir`.
- Exact pins, no `^`/`~`: `typescript 7.0.2`, `@types/node 24.19.2`; `.nvmrc` = `24.22.3`.
- Scripts: `check` → `tsc -p tsconfig.json`, `test` → `node --test "test/**/*.test.ts"` (quoted), `cli` → `node src/cli.ts`.
- `.gitignore`: `factory/state/`, `*.tmp`/`.tmp-*`.
- `@types/node` is flagged `SUS` in the audit — planner must add a `checkpoint:human-verify` before install.

### 2. `factory/` contract files (config/contract, transform)

**Source:** 01-RESEARCH.md §Design 1 (354-465), §Design 9 (1147-1203), §Design 2 (467-572).

- `factory/schemas/work-item.schema.json`: `additionalProperties: false`, the 15 frontmatter fields from
  Design 1's table, and enum arrays that must match the TS constants in §Code Examples "Typed constants
  without enums" (1444-1446). A parity test is required (Design 10 test map).
- `factory/config.json`: shape exactly as Design 9 (1151-1186). Every `providers` slot `null` in Phase 1
  (C8). Repository key regex `^[a-z0-9][a-z0-9-]{0,63}$`.
- `factory/WORKFLOW.md`: human policy prose only — **not parsed** (Design 1, line 218). Do not add a parser.

### 3. `src/domain/*` (pure service, transform) — the highest-volatility code

**Source:** 01-RESEARCH.md §Design 1 (354-465), §Design 2 (467-572), §Design 5 (806-913), §Design 7 error codes (1080-1084).

**Purity rule (must be a shared pattern):** no `node:fs`, `node:process`, `node:child_process`, or
`node:os`. Inputs are strings/objects; outputs are values or typed errors.

**Typed constants — never `enum`** (Code Examples, 1435-1446):
```ts
export const CATEGORIES = ['incident', 'issue', 'planbaar-werk'] as const;
export type Category = (typeof CATEGORIES)[number];

export const WORKFLOW_STATUSES = ['ready', 'in-progress', 'blocked', 'done'] as const;
export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number];

export const TRIAGE_STATUSES = ['needs-triage', 'needs-info', 'ready-for-agent', 'wontfix'] as const;
export type TriageStatus = (typeof TRIAGE_STATUSES)[number];
```

**Hash payload — length-prefixed, format-versioned** (Design 2, 504-534). Copy structure exactly; the
`REVISION_FORMAT` string is part of the hash so normalization changes bump it:
```ts
const REVISION_FORMAT = 'sf-revision-v1';
function field(value: string): string {
  return `${Buffer.byteLength(value, 'utf8')}:${value}`;
}
export function computeRevision(input: {
  repository: string; targetBranch: string; scope: string;
  outOfScope: string; acceptanceCriteria: string[];
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

**Queue predicate + comparator** (Design 5, 814-854) — eligibility is a pure `every(done)` check; sort a
**copy**, never `readdir` order:
```ts
export function compareQueueOrder(a: WorkItem, b: WorkItem): number {
  return a.priority - b.priority
    || a.createdAt.localeCompare(b.createdAt)
    || a.id.localeCompare(b.id);
}
```

- `dependencies.ts`: DFS three-color cycle detection, report path (`A → B → C → A`) (863).
- `transitions.ts`: the exact allowed-transition table (643-652); everything else `invalid-transition`.
- Every error thrown in domain must carry a code from the contract list (1080-1084). Codes are additive only.

### 4. `src/state/atomic-file.ts` (fs adapter, file-I/O)

**Source:** 01-RESEARCH.md §Design 3 (577-638), Pitfall 2 (1309-1313).

Copy `writeFileAtomic` and `fsyncDirectory` verbatim from Design 3. Non-negotiable ordering:
`open('wx') temp → writeFile → handle.sync() → close → rename → fsyncDirectory`. On failure, unlink temp.
`fsyncDirectory` tolerates only `EINVAL|EPERM|EBADF|EISDIR|ENOTSUP`; must not swallow real I/O errors.

### 5. `src/state/{work-item-store,lease,run-log}.ts` (state adapters, file-I/O + events)

**Source:** 01-RESEARCH.md §Design 3 (640-693), §Design 4 (695-804), §Design 6 (914-1010), §Design 8 (1086-1145).

**Move protocol** (Design 3, 654-664): validate transition → refuse if destination exists or `EXDEV` →
`rename` → `writeFileAtomic(dest)` with new status → fsync both dirs. **Never** `copyFile`+unlink.

**Lease acquire — the lock is existence, not content** (Design 4, 723-747):
```ts
handle = await open(paths.leaseFile, 'wx', 0o600);
await handle.writeFile(`${JSON.stringify(lease)}\n`, 'utf8');
await handle.sync();
// EEXIST → LeaseHeldError; finally close()
await fsyncDirectory(paths.stateDir);
await unlinkIfExists(paths.heartbeatFile);
```
Expiry triggers **classification** (table 755-764), never acquisition. Heartbeat is a **separate** file.

**JSONL append** (Design 6, 1420-1431): `appendFile(path, line, { flag: 'a', flush: true })`. Reader:
torn **last** line → ignore with warning; malformed non-last → `run-log-corrupt`, never rewrite.
`deriveRunState` classifier at 977-994. Receipt written atomically at terminal only.

- `work-item-store.ts`: fixed four-directory `readdir` (no glob recursion), **sort results**, detect duplicate IDs across dirs.

### 6. `src/runners/*` (provider adapter, request-response in-process)

**Source:** 01-RESEARCH.md §Design 8 (1090-1145).

Copy the `Runner`, `RunnerInput`, `RunnerResult`, `RunnerContext`, `RunnerProbe`, `Artifact` types
verbatim. Demo writes `artifacts/demo-report.md` atomically and returns `succeeded`; `probe` returns
`completed` only if the report exists with the run ID, else `not-started`. **No `readline` inside
`runners/`** (Pitfall 14) and **no `child_process`** (C4). Artifact path containment check before write
(Design 8, 1143).

### 7. `src/cli.ts`, `src/commands/*`, `src/util/output.ts`, `src/util/errors.ts` (controller, request-response)

**Source:** 01-RESEARCH.md §Design 7 (1012-1084), Code Examples "CLI parsing and envelope" (1399-1418), §Design 4 resume/replace (779-797).

**Arg parsing** — `node:util parseArgs`, null-prototype result, reject `--json`+`--human` with exit 2:
```ts
const { values, positionals } = parseArgs({
  args: process.argv.slice(2), allowPositionals: true,
  options: { json: { type: 'boolean', default: false },
             human: { type: 'boolean', default: false },
             yes: { type: 'boolean', short: 'y', default: false } },
});
```

**Envelope** — exactly one JSON object on stdout for `--json` and `queue` (Design 7, 1038-1053):
`{ outputVersion: 1, command, ok, data, warnings, errors }`. Prompt/progress/human text → **stderr** only.

**Exit codes** (1057-1064): `0` success incl. idle/busy queue · `1` internal/I-O · `2` usage/invalid data ·
`3` workflow-state refusal. Idle queue is **0** (D-08).

**Run orchestration ordering** (Design 3 crash windows 666-680, Design 4 779-797): reconcile → acquire lease →
mkdir run + `run.started` (flush) → move item → heartbeat → runner → terminal event → receipt → item
transition → release; loop until idle. Resume reuses run ID; replacement new ID with `attempt+1` and an
appended `run.interrupted`.

### 8. `src/config/config.ts` (config loader, transform)

**Source:** 01-RESEARCH.md §Design 9 (1147-1203). Validate `schemaVersion === 1`, repository key regex,
`defaultBranch` (no whitespace/`..`), `allowedCategories` subset, fixed `providers` slots, numeric bounds
(TTL ≥ 30, heartbeat ≥ 5 and < TTL, timeout ≥ 1). Unknown repository → `unknown-repository`. `providerRefs`
against a `null` slot → warning `provider-not-configured`, never a workflow failure.

### 9. `src/util/clock.ts` (utility)

**Source:** 01-RESEARCH.md §Design 10 "Clock injection" (1230-1240). Copy `Clock` + `MutableClock`
verbatim (`set(iso)`, `advanceSeconds(n)`). Lease/recovery tests advance the clock; no `sleep`.

### 10. Tests (test, unit/integration)

**Source:** 01-RESEARCH.md §Design 10 (1205-1290), Pitfalls 9/12 (1351-1373), §Validation Architecture (1505-1545).

- `test/helpers/temp-factory.ts`: `mkdtemp` root per test, `t.after` recursive removal, `MutableClock`,
  `writeItem`/`writeRaw`/`cleanup`. Never share a fixture dir (tests run in parallel processes).
- Fixtures are **data only** (`.json`/`.md`), never `.ts` (Pitfall 9). Run `node --test "test/**/*.test.ts"`
  quoted so helpers aren't discovered.
- Construct crash states on disk (ten cases, 1246-1256); real `O_EXCL` concurrency test with N child
  processes (1261). `no-shell.test.ts` and `no-network.test.ts` static scans over `src/**/*.ts`.
- CLI tests: spawn `process.execPath` with `src/cli.ts`, absolute temp `--root`, `TZ=UTC`, `LC_ALL=C`.

---

## Shared Patterns

### S1. Pure domain vs. state adapter
`src/domain/**` imports no `node:fs`, `node:process`, `node:child_process`, `node:os`. All filesystem
access lives in `src/state/**` and the test helper. Violations are caught by `no-shell.test.ts` (and
should be extended to `node:fs` in domain).

### S2. Atomic writes only
Every persisted mutation uses `writeFileAtomic` (temp → fsync → rename → dir fsync). No bare `writeFile`,
no `copyFile`+unlink, no `access()`-then-`open()` (TOCTOU). Lease is `open('wx')`.

### S3. Strict path containment
UUID-validate every `id`; repository keys match `^[a-z0-9][a-z0-9-]{0,63}$`; artifact `path` must be
relative, no `..`, and resolve inside `runDir` (`path.resolve(runDir, p).startsWith(runDir + path.sep)`).
Never `path.join(root, item.id)` without validation.

### S4. Stable error codes
One error-code vocabulary (Design 7, 1080-1084) shared by domain, state, and CLI. Add new codes; never
repurpose. `errors[]` entries: `{ code, message, file?, itemId?, line?, details? }`.

### S5. Deterministic ordering
Sort every directory listing before use; queue order = `priority → createdAt → id`; sort error output by
file then line. Never depend on `readdir` order.

### S6. No shell, no network
No `child_process`, `execSync`, `spawnSync`, `eval(`, `new Function` in `src/`; no `node:http(s)`, `node:net`,
`node:dns`, `fetch(`. Runner receives parsed data and returns a result — never a command.

### S7. Injected time
Only `src/util/clock.ts` exposes `now()`. Persist ISO 8601 UTC strings; compare via `Date.parse`. No
`new Date()` scattered, no `toLocaleString()` in persisted data.

### S8. Erasable TypeScript only
`as const` unions instead of `enum`; `import type` for type-only imports; `.ts` extensions in imports;
`"type": "module"`. Required by Node native type stripping and `erasableSyntaxOnly`.

### S9. Inspection is side-effect free
`validate`, `queue`, `status`, `show`, `runs` never write. `reconcile` is the **only** repair command
(ordered precedence, Design 3, 682-693).

---

## No Analog Found

| File / Group | Role | Data Flow | Reason |
|---|---|---|---|
| all 57 files/groups above | mixed | mixed | Working tree is greenfield; the only tracked implementation was intentionally deleted. Use 01-RESEARCH.md design sections cited above as the pattern source. |

---

## Metadata

**Analog search scope:** repo root; tracked tree via `git ls-files` (71 tracked paths, all docs/`.planning` plus deleted-in-worktree implementation blobs). No live `src/`, `test/`, or `package.json` on disk.
**Files scanned:** 0 source analogs (greenfield); `.planning/phases/01-local-work-items-and-queue/01-{CONTEXT,RESEARCH,VALIDATION}.md` read in full.
**Tracked-source gate:** all cited pattern sources (`.planning/.../01-RESEARCH.md`) are git-tracked; no mirror paths emitted.
**Pattern extraction date:** 2026-11-22
