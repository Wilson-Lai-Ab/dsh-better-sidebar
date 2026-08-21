# In-package review / explorer domain split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move review and explorer/file-find code into domain folders inside the single `dsh-better-sidebar` package, with no behavior or install change.

**Architecture:** Host review ledger files live under `src/review/`. Directory listing and filename search live under `src/explorer/` (the Node walker stays in `fs-find.ts`; browser-safe scoring/presentation stay in `fs-find-match.ts`). Client review UI/state lives under `src/client/review/`; `ExplorerView` lives under `src/client/explorer/`. Shell files (`src/index.ts`, `api.ts`, `TextEditor`, `EditorHost`, `Sidebar`, `builtins/tabs.tsx`) keep their jobs and import only from each domain’s `index.ts`.

**Tech Stack:** TypeScript, Vitest, existing `pnpm test` / `pnpm typecheck` / `pnpm build` in `DSH-better-sidebar`. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-08-19-in-package-domain-split-design.md`

## Global Constraints

- One installable plugin only. Do not create `dsh-sidebar-review` or a workspace subpackage.
- Do not change tab ids `review` / `explorer` / `git`.
- Do not change host route semantics: `review.get`, `review.put`, `fs.find`, `fs.tree`.
- Do not change `review.json` path, scoring, or IDE-style search row presentation.
- Do not split `sidebar.module.css`, `locales.ts`, or `TextEditor.tsx`.
- Do not change function signatures. Import paths only.
- `src/review` must not import `src/explorer` and vice versa.
- Client must not import `src/explorer/fs-find.ts` (it uses `node:fs`). Import `presentFindHit` via `src/explorer/index.ts` (re-export from `fs-find-match.ts` only).
- Existing tests are the safety net. Do not rewrite assertions. Do not add feature tests for this move.
- Commit this refactor as its own commit. Do not mix unrelated `feat/git-staging-sections` edits into the same commit if they are not part of the move.
- Work from `DSH-better-sidebar/` (`pnpm test`, `pnpm typecheck`, `pnpm build`).

---

## File map

**Create**

- `src/review/index.ts` — re-export host ledger helpers used by `src/index.ts` and tests
- `src/explorer/index.ts` — re-export listing + find (client-safe symbols from `fs-find-match.ts`; `findFiles` / `FIND_LIMIT_DEFAULT` from `fs-find.ts` for host/tests only)
- `src/client/review/index.ts` — re-export everything the shell currently imports from review modules
- `src/client/explorer/index.ts` — re-export `ExplorerView`

**Move (git mv if tracked, `mv` if still untracked)**

| From | To |
|---|---|
| `src/review-document.ts` | `src/review/review-document.ts` |
| `src/review-disk.ts` | `src/review/review-disk.ts` |
| `src/fs-tree.ts` | `src/explorer/fs-tree.ts` |
| `src/fs-find.ts` | `src/explorer/fs-find.ts` |
| `src/fs-find-match.ts` | `src/explorer/fs-find-match.ts` |
| `src/client/ReviewView.tsx` | `src/client/review/ReviewView.tsx` |
| `src/client/ReviewBar.tsx` | `src/client/review/ReviewBar.tsx` |
| `src/client/ReviewHunkBar.tsx` | `src/client/review/ReviewHunkBar.tsx` |
| `src/client/review-actions.ts` | `src/client/review/review-actions.ts` |
| `src/client/review-filter.ts` | `src/client/review/review-filter.ts` |
| `src/client/review-history.ts` | `src/client/review/review-history.ts` |
| `src/client/review-hunks.ts` | `src/client/review/review-hunks.ts` |
| `src/client/review-model.ts` | `src/client/review/review-model.ts` |
| `src/client/review-store.ts` | `src/client/review/review-store.ts` |
| `src/client/use-session-edits.ts` | `src/client/review/use-session-edits.ts` |
| `src/client/ExplorerView.tsx` | `src/client/explorer/ExplorerView.tsx` |
| `tests/review-disk.spec.ts` | `tests/review/review-disk.spec.ts` |
| `tests/fs-find.spec.ts` | `tests/explorer/fs-find.spec.ts` |

**Modify imports only**

- `src/index.ts`
- `src/client/api.ts`
- `src/client/builtins/tabs.tsx`
- `src/client/TextEditor.tsx`
- `src/client/EditorHost.tsx`
- `src/client/Sidebar.tsx`
- `src/explorer/fs-tree.ts` (`./wire.ts` → `../wire.ts`)
- `src/client/review/review-store.ts` (`../review-document.ts` → `../../review/review-document.ts`)
- `src/client/explorer/ExplorerView.tsx` (`presentFindHit` from `../../explorer`)
- `tests/unit.spec.ts`, `tests/smoke.spec.ts`, `tests/review/review-disk.spec.ts`, `tests/explorer/fs-find.spec.ts`

**Do not move:** `src/client/api.ts`, `locales.ts`, `sidebar.module.css`, `TextEditor.tsx`, git/terminal/browser modules.

---

### Task 1: Move host review ledger into `src/review/`

**Files:**
- Create: `src/review/index.ts`
- Move: `src/review-document.ts` → `src/review/review-document.ts`
- Move: `src/review-disk.ts` → `src/review/review-disk.ts`
- Modify: `src/index.ts` (review-disk import)
- Modify: `src/client/review-store.ts` if not yet moved — only if still at old path; if Task 3 already moved it, skip (this task runs first, so update the **current** `src/client/review-store.ts` import)
- Test: `tests/review-disk.spec.ts` (still at old path until Task 4)

**Interfaces:**
- Consumes: existing `readReviewDocument`, `writeReviewDocument`, `reviewFilePath`, `defaultSessionsRoot`, `parseReviewDocument`, `emptyReviewDocument`
- Produces: `src/review/index.ts` re-exports exactly:

```ts
export {
  defaultSessionsRoot,
  parseReviewDocument,
  readReviewDocument,
  reviewFilePath,
  writeReviewDocument,
  REVIEW_FILE,
  encodeSessionSegment,
  emptyReviewDocument,
  type ReviewDecision,
  type ReviewDocument,
} from './review-disk.ts'
```

(`review-disk.ts` already re-exports document helpers.)

- [ ] **Step 1: Confirm current tests pass (baseline)**

Run from `DSH-better-sidebar/`:

```bash
pnpm exec vitest run tests/review-disk.spec.ts
```

Expected: PASS (file still at `tests/review-disk.spec.ts` importing `../src/review-disk.ts` and `../src/client/review-store.ts`).

- [ ] **Step 2: Create the folder and move the two host files**

```bash
mkdir -p src/review
git mv src/review-document.ts src/review/review-document.ts 2>/dev/null || mv src/review-document.ts src/review/review-document.ts
git mv src/review-disk.ts src/review/review-disk.ts 2>/dev/null || mv src/review-disk.ts src/review/review-disk.ts
```

Do not edit the bodies except: `src/review/review-disk.ts` already imports `./review-document.ts` — both files now share a folder, so that import stays.

- [ ] **Step 3: Add `src/review/index.ts`**

Create the file with the re-export block in **Interfaces** above.

- [ ] **Step 4: Point host and client at the new path**

In `src/index.ts` replace:

```ts
} from './review-disk.ts'
```

with:

```ts
} from './review/index.ts'
```

Keep the imported names unchanged (`defaultSessionsRoot`, `parseReviewDocument`, `readReviewDocument`, `reviewFilePath`, `writeReviewDocument`).

In `src/client/review-store.ts` replace:

```ts
} from '../review-document.ts'
```

with:

```ts
} from '../../review/review-document.ts'
```

Wait — after this task the client file is still at `src/client/review-store.ts`, so the correct path is `../review/review-document.ts`. Use:

```ts
} from '../review/review-document.ts'
```

(Task 3 will change this again to `../../review/review-document.ts` when the file moves into `src/client/review/`.)

- [ ] **Step 5: Temporarily fix the disk test import so the suite still runs**

In `tests/review-disk.spec.ts` change:

```ts
} from '../src/review-disk.ts'
```

to:

```ts
} from '../src/review/index.ts'
```

Leave the `review-store` import as `../src/client/review-store.ts` until Task 3/4.

- [ ] **Step 6: Run the disk tests**

```bash
pnpm exec vitest run tests/review-disk.spec.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/review src/index.ts src/client/review-store.ts tests/review-disk.spec.ts
git commit -m "refactor: move review ledger files into src/review"
```

If other unrelated dirty files are staged, unstage them first. Only these paths belong in this commit.

---

### Task 2: Move explorer listing + find into `src/explorer/`

**Files:**
- Create: `src/explorer/index.ts`
- Move: `src/fs-tree.ts` → `src/explorer/fs-tree.ts`
- Move: `src/fs-find.ts` → `src/explorer/fs-find.ts`
- Move: `src/fs-find-match.ts` → `src/explorer/fs-find-match.ts`
- Modify: `src/explorer/fs-tree.ts` (wire import)
- Modify: `src/index.ts` (`fs.tree` / `fs.find` imports)
- Modify: `src/client/ExplorerView.tsx` (`presentFindHit` import) — still at old client path
- Test: `tests/fs-find.spec.ts`, `tests/unit.spec.ts` (fs-tree describe), `tests/smoke.spec.ts`

**Interfaces:**
- Consumes: existing `listDirectory`, `listDirectoryCompact`, `findFiles`, `presentFindHit`, `FIND_LIMIT_DEFAULT`
- Produces: `src/explorer/index.ts`:

```ts
export {
  compareEntries,
  compactDirectoryEntry,
  isWithin,
  listDirectory,
  listDirectoryCompact,
  parentOf,
  requireAbsolute,
  rootLabel,
  type SidebarFsEntry,
  type SidebarFsListing,
} from './fs-tree.ts'
export { FIND_LIMIT_DEFAULT, findFiles } from './fs-find.ts'
export {
  presentFindHit,
  scoreFileNameMatch,
  shouldSkipFindDir,
  treeOfFindHits,
  type FileFindHit,
  type FileNameMatch,
  type FindHitPresentation,
  type FindTreeFile,
  type FindTreeNode,
} from './fs-find-match.ts'
```

`src/explorer/index.ts` may import `./fs-find.ts`. **Client files must not.** `ExplorerView` imports `presentFindHit` from `../explorer/index.ts` (or `../../explorer` after Task 5). Bundlers follow that binding to `fs-find-match.ts` only if the client import specifier is the match module **or** the index is carefully split.

**Client-safety rule (required):** do **not** have `ExplorerView` import from `src/explorer/index.ts` if that file also exports `findFiles` from `fs-find.ts` — tsdown/client purity will pull `node:fs`. Instead:

- Host / tests import listing+find from `src/explorer/index.ts`.
- Client imports `presentFindHit` from `src/explorer/fs-find-match.ts` **or** from a second file `src/explorer/match.ts` that only re-exports match helpers.

Use a second entry so the spec’s “via `src/explorer`” still holds without dragging Node into the client:

Create `src/explorer/match.ts`:

```ts
export {
  presentFindHit,
  scoreFileNameMatch,
  shouldSkipFindDir,
  treeOfFindHits,
  type FileFindHit,
  type FileNameMatch,
  type FindHitPresentation,
  type FindTreeFile,
  type FindTreeNode,
} from './fs-find-match.ts'
```

Client: `import { presentFindHit } from '../../explorer/match.ts'` (after Task 5) or `from '../explorer/match.ts'` while ExplorerView is still in `src/client/`.

- [ ] **Step 1: Baseline tests**

```bash
pnpm exec vitest run tests/fs-find.spec.ts tests/smoke.spec.ts tests/unit.spec.ts
```

Expected: PASS (ignore unrelated dirty-tree failures only if they already failed before this task — if so, stop and report; do not “fix” unrelated tests).

- [ ] **Step 2: Move the three files**

```bash
mkdir -p src/explorer
git mv src/fs-tree.ts src/explorer/fs-tree.ts
git mv src/fs-find.ts src/explorer/fs-find.ts 2>/dev/null || mv src/fs-find.ts src/explorer/fs-find.ts
git mv src/fs-find-match.ts src/explorer/fs-find-match.ts 2>/dev/null || mv src/fs-find-match.ts src/explorer/fs-find-match.ts
```

- [ ] **Step 3: Fix `fs-tree.ts` Node import**

In `src/explorer/fs-tree.ts` replace:

```ts
import { SidebarError } from './wire.ts'
```

with:

```ts
import { SidebarError } from '../wire.ts'
```

`fs-find.ts` still imports `./fs-find-match.ts` — same folder, unchanged.

- [ ] **Step 4: Add `src/explorer/index.ts` and `src/explorer/match.ts`**

Use the exact export lists in **Interfaces**.

- [ ] **Step 5: Update host and client imports**

`src/index.ts`:

```ts
import { isWithin, parentOf, requireAbsolute, listDirectoryCompact, rootLabel } from './explorer/index.ts'
import { FIND_LIMIT_DEFAULT, findFiles } from './explorer/index.ts'
```

(or one combined import from `./explorer/index.ts`)

`src/client/ExplorerView.tsx`:

```ts
import { presentFindHit } from '../explorer/match.ts'
```

- [ ] **Step 6: Update tests that import the old paths**

`tests/fs-find.spec.ts`:

```ts
import { findFiles, presentFindHit, scoreFileNameMatch, shouldSkipFindDir, treeOfFindHits } from '../src/explorer/index.ts'
```

`tests/unit.spec.ts` fs-tree import:

```ts
import { compareEntries, compactDirectoryEntry, isWithin, listDirectoryCompact, parentOf, rootLabel, requireAbsolute } from '../src/explorer/index.ts'
```

`tests/smoke.spec.ts`:

```ts
import { listDirectory } from '../src/explorer/index.ts'
```

Do not change any `expect(...)`.

- [ ] **Step 7: Run tests**

```bash
pnpm exec vitest run tests/fs-find.spec.ts tests/smoke.spec.ts tests/unit.spec.ts
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/explorer src/index.ts src/client/ExplorerView.tsx tests/fs-find.spec.ts tests/unit.spec.ts tests/smoke.spec.ts
git commit -m "refactor: move explorer listing and file-find into src/explorer"
```

---

### Task 3: Move client review modules into `src/client/review/`

**Files:**
- Create: `src/client/review/index.ts`
- Move all client review files listed in the file map
- Modify: `src/client/review/review-store.ts` document import (one extra `../`)
- Modify shell: `TextEditor.tsx`, `EditorHost.tsx`, `Sidebar.tsx`, `builtins/tabs.tsx`
- Test: `tests/review-disk.spec.ts` (review-store import), `tests/unit.spec.ts` (review-* imports)

**Interfaces:**
- Consumes: modules after the move keep **sibling** imports (`./review-store.ts`, etc.)
- Produces: `src/client/review/index.ts` must export every symbol the shell uses today:

```ts
export { ReviewView } from './ReviewView.tsx'
export { ReviewBar } from './ReviewBar.tsx'
export { ReviewHunkBar } from './ReviewHunkBar.tsx'
export { keepEdit, undoEdit, keepHunk, undoHunk, revertLastReview } from './review-actions.ts'
export { canRevertReview, clearReviewHistory } from './review-history.ts'
export {
  applyHunkUndo,
  hunkAtLine,
  hunkLineLabel,
  hunksFromGutterLines,
  hunksFromTexts,
  hunksOfAllAdd,
  hunksOfDiff,
  reviewGutterPaint,
  type ReviewHunk,
} from './review-hunks.ts'
export {
  collectSessionEdits,
  groupEditsByTurn,
  latestSessionEdits,
  promptPreview,
  reviewLocations,
  type SessionEdit,
} from './review-model.ts'
export {
  decisionOf,
  hunkDecisionOf,
  hydrateReview,
  pendingCount,
  pickReviewDocument,
  rememberReviewScope,
  reviewRevision,
  setHunkDecision,
  setReviewDecision,
  subscribeReview,
  syncFileDecisionFromHunks,
  type ReviewDecision,
} from './review-store.ts'
export {
  clampReviewDoneSessions,
  decidedBySession,
  needsOlderTurns,
  pendingEdits,
  sessionsWithEdits,
  takeNewestTurns,
} from './review-filter.ts'
export { useSessionEdits } from './use-session-edits.ts'
```

`review-store.ts` still imports `{ api, type SessionScope } from '../api.ts'` (one level up — still correct after the move).  
`review-actions.ts` still imports `../api.ts` and `../git-repo.ts`.

- [ ] **Step 1: Move the client review files**

```bash
mkdir -p src/client/review
# tracked or untracked — mv is fine
mv src/client/ReviewView.tsx src/client/ReviewBar.tsx src/client/ReviewHunkBar.tsx \
   src/client/review-actions.ts src/client/review-filter.ts src/client/review-history.ts \
   src/client/review-hunks.ts src/client/review-model.ts src/client/review-store.ts \
   src/client/use-session-edits.ts \
   src/client/review/
```

Sibling imports among these files (`./review-store.ts`) stay valid.

- [ ] **Step 2: Fix the ledger import inside the store**

In `src/client/review/review-store.ts` replace the document import (now one directory deeper) with:

```ts
} from '../../review/review-document.ts'
```

- [ ] **Step 3: Add `src/client/review/index.ts`**

Use the export list in **Interfaces**. If `tsc` reports a missing export, add that name — do not change call sites to deep-import.

- [ ] **Step 4: Point the shell at the domain entry**

`src/client/TextEditor.tsx` — delete the six review imports and use:

```ts
import {
  ReviewHunkBar,
  revertLastReview,
  canRevertReview,
  clearReviewHistory,
  hunkAtLine,
  hunksFromGutterLines,
  hunksFromTexts,
  hunksOfAllAdd,
  hunksOfDiff,
  reviewGutterPaint,
  decisionOf,
  hunkDecisionOf,
  reviewRevision,
  subscribeReview,
  syncFileDecisionFromHunks,
  useSessionEdits,
} from './review/index.ts'
```

`src/client/EditorHost.tsx`:

```ts
import {
  ReviewBar,
  revertLastReview,
  canRevertReview,
  decisionOf,
  reviewRevision,
  subscribeReview,
  useSessionEdits,
} from './review/index.ts'
```

`src/client/Sidebar.tsx`:

```ts
import { reviewRevision, subscribeReview } from './review/index.ts'
```

`src/client/builtins/tabs.tsx`:

```ts
import { ReviewView, collectSessionEdits, latestSessionEdits, pendingCount } from '../review/index.ts'
```

Leave the `ExplorerView` import for Task 5.

- [ ] **Step 5: Point tests at the new review-store path**

`tests/review-disk.spec.ts`:

```ts
import { pickReviewDocument } from '../src/client/review/index.ts'
```

`tests/unit.spec.ts` replace the three review client imports with:

```ts
import { applyHunkUndo, hunkLineLabel, hunksFromGutterLines, hunksOfDiff, reviewGutterPaint } from '../src/client/review/index.ts'
import { peekReviewUndo, popReviewRedo, popReviewUndo, pushReviewRevert } from '../src/client/review/review-history.ts'
```

`peekReviewUndo` / `popReview*` / `pushReviewRevert` are test-only. Either add them to `src/client/review/index.ts` or import `review-history.ts` directly from the test. Prefer adding them to the barrel so tests also use the domain entry:

```ts
export { peekReviewUndo, popReviewRedo, popReviewUndo, pushReviewRevert } from './review-history.ts'
```

Then `unit.spec.ts` uses only `../src/client/review/index.ts` for history + hunks + model + filter + store.

Also update:

```ts
import { collectSessionEdits, groupEditsByTurn, latestSessionEdits, promptPreview, reviewLocations } from '../src/client/review/index.ts'
import { clampReviewDoneSessions, decidedBySession, needsOlderTurns, pendingEdits, sessionsWithEdits, takeNewestTurns } from '../src/client/review/index.ts'
import { decisionOf, pendingCount, setHunkDecision, setReviewDecision, syncFileDecisionFromHunks } from '../src/client/review/index.ts'
```

- [ ] **Step 6: Run review-related tests and typecheck**

```bash
pnpm exec vitest run tests/review-disk.spec.ts tests/unit.spec.ts
pnpm typecheck
```

Expected: tests PASS; `tsc --noEmit` clean.

- [ ] **Step 7: Commit**

```bash
git add src/client/review src/client/TextEditor.tsx src/client/EditorHost.tsx src/client/Sidebar.tsx src/client/builtins/tabs.tsx tests/review-disk.spec.ts tests/unit.spec.ts
git commit -m "refactor: move client review modules into src/client/review"
```

---

### Task 4: Relocate review and find specs next to their domains

**Files:**
- Move: `tests/review-disk.spec.ts` → `tests/review/review-disk.spec.ts`
- Move: `tests/fs-find.spec.ts` → `tests/explorer/fs-find.spec.ts`
- Modify: import prefixes inside those two files (`../src/...` → `../../src/...`)

**Interfaces:**
- Consumes: barrels from Tasks 1–2
- Produces: same assertions, new paths

- [ ] **Step 1: Move the spec files**

```bash
mkdir -p tests/review tests/explorer
git mv tests/review-disk.spec.ts tests/review/review-disk.spec.ts 2>/dev/null || mv tests/review-disk.spec.ts tests/review/review-disk.spec.ts
git mv tests/fs-find.spec.ts tests/explorer/fs-find.spec.ts 2>/dev/null || mv tests/fs-find.spec.ts tests/explorer/fs-find.spec.ts
```

- [ ] **Step 2: Fix relative imports (one extra `../`)**

`tests/review/review-disk.spec.ts`:

```ts
import { pickReviewDocument } from '../../src/client/review/index.ts'
import {
  /* existing named imports unchanged */
} from '../../src/review/index.ts'
```

`tests/explorer/fs-find.spec.ts`:

```ts
import { findFiles, presentFindHit, scoreFileNameMatch, shouldSkipFindDir, treeOfFindHits } from '../../src/explorer/index.ts'
```

Do not edit `expect` blocks.

- [ ] **Step 3: Run the moved specs**

```bash
pnpm exec vitest run tests/review/review-disk.spec.ts tests/explorer/fs-find.spec.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add tests/review tests/explorer
git commit -m "refactor: colocate review and explorer tests with their domains"
```

---

### Task 5: Move `ExplorerView` and close the explorer client entry

**Files:**
- Create: `src/client/explorer/index.ts`
- Move: `src/client/ExplorerView.tsx` → `src/client/explorer/ExplorerView.tsx`
- Modify: `src/client/explorer/ExplorerView.tsx` (`presentFindHit` path)
- Modify: `src/client/builtins/tabs.tsx`

**Interfaces:**
- Consumes: `presentFindHit` from `../../explorer/match.ts`
- Produces:

```ts
// src/client/explorer/index.ts
export { ExplorerView } from './ExplorerView.tsx'
```

- [ ] **Step 1: Move the view**

```bash
mkdir -p src/client/explorer
git mv src/client/ExplorerView.tsx src/client/explorer/ExplorerView.tsx
```

- [ ] **Step 2: Fix the match import and CSS / locale / api imports**

`ExplorerView` currently uses:

```ts
import { api, downloadUrl, type FsEntry, type FsFindHit } from './api.ts'
import { presentFindHit } from '../explorer/match.ts'
import { t } from './locales.ts'
import css from './sidebar.module.css'
```

After the move those become:

```ts
import { api, downloadUrl, type FsEntry, type FsFindHit } from '../api.ts'
import { presentFindHit } from '../../explorer/match.ts'
import { t } from '../locales.ts'
import css from '../sidebar.module.css'
```

Also rewrite every other `./foo` import in that file that pointed at `src/client/*` (`dom-sync`, `file-ref`, `git-status-style`, `paths`) to `../foo`.

- [ ] **Step 3: Add the barrel and update tabs**

Create `src/client/explorer/index.ts` as in **Interfaces**.

`src/client/builtins/tabs.tsx`:

```ts
import { ExplorerView } from '../explorer/index.ts'
```

- [ ] **Step 4: Typecheck**

```bash
pnpm typecheck
```

Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/client/explorer src/client/builtins/tabs.tsx
git commit -m "refactor: move ExplorerView into src/client/explorer"
```

---

### Task 6: Full verification (no behavior change)

**Files:**
- None, unless typecheck/tests reveal a leftover import

**Interfaces:**
- Consumes: Tasks 1–5 complete
- Produces: green CI-equivalent local run

- [ ] **Step 1: Grep for stale paths**

```bash
rg "from ['\\\"].*/(review-disk|review-document|fs-tree|fs-find|ExplorerView|review-store)\\.ts" src tests
```

Expected: no hits outside the new domain folders (internal files may still import siblings by basename).

Confirm no client file imports `src/explorer/fs-find.ts` or `src/explorer/index.ts` if that barrel re-exports `findFiles`.

- [ ] **Step 2: Run the full unit suite, typecheck, and build**

```bash
pnpm test
pnpm typecheck
pnpm build
```

Expected: all green. `lib/client.js` still builds (Explorer search still in the client bundle; `node:fs` must not appear as a client import).

- [ ] **Step 3: Manual check (same GUI, hard refresh only)**

At `http://127.0.0.1:3080`:

1. Explorer search still shows `Name of package    module`.
2. Review tab still lists pending files; badge still counts.
3. Opening a pending file still paints hunks and Keep/Undo.

Do not click Keep for the user.

- [ ] **Step 4: Commit only if Step 1–2 required leftover import fixes**

```bash
git add -u
git commit -m "refactor: finish review/explorer domain import cleanup"
```

Skip this commit if the tree is already clean after Task 5.

---

## Spec coverage

| Spec section | Task |
|---|---|
| Single package, no new install | Global constraints + no new package.json |
| `src/review/` host files | Task 1 |
| `src/explorer/` listing + find | Task 2 |
| `src/client/review/` + barrel | Task 3 |
| Tests next to domains | Task 4 |
| `src/client/explorer/` | Task 5 |
| Shell import-only, no signature change | Tasks 1–5 |
| No CSS / locales / TextEditor split | Global constraints |
| Client must not import Node walker | Task 2 `match.ts` |
| test + typecheck + build | Task 6 |
| Independent review plugin / workspace packages | Explicitly out of plan |

## Self-review notes

- This is a move, not a feature: existing specs are the red/green net. New failing tests would only lock today’s behavior twice.
- `src/explorer/match.ts` is required so the client never evaluates `findFiles`’s `node:fs` import. The spec’s “via `src/explorer`” is satisfied by that folder, not by forcing one barrel into the browser.
- `review-store` import depth changes twice (Task 1 then Task 3). Follow the path written in the **current** task.
- Do not commit the whole dirty `feat/git-staging-sections` tree in these commits.
