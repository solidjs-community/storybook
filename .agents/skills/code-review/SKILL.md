---
name: code-review
description: >-
  Use when a PR-sized slice is complete and needs review before commit, or when
  the diff may reinvent APIs, add wrappers, or grow without shrinking. Not for
  open-ended bug hunts.
license: MIT
---

# Code review

Review a finished slice, shrink leftover structure, and fix obvious defects.
You apply local fixes yourself. Ask the user only when the call needs a
product or design decision.

## Scope

Paths, symbols, or an area the user named win. A named fixed point (branch,
tag, `main`, PR) → `git diff <fixed>...HEAD` (three-dot), still honor those
paths inside it.

Otherwise: `git diff --no-color` and `git diff --cached --no-color`. No local
diff → files from this conversation. Still nothing → `git show --stat --patch
--no-color HEAD`.

Stay inside that scope except to match existing patterns. Preserve unrelated
user changes.

## 1. Triage

Read the scoped diff. You do reuse and smell on every review: reinvented APIs,
wrappers, pass-throughs, muddy shape.

Then decide whether a second reader is worth the cost. Default is no.

| Extra eyes       | When                                                                                          |
| ---------------- | --------------------------------------------------------------------------------------------- |
| none (default)   | You can finish reuse, smell, problems, and the review from this read.                         |
| one extra reader | The diff touches a **critical surface** you cannot judge from this read alone. Name that gap. |

A critical surface is real trust or a hunt you cannot finish here:

- auth, secrets, injection, user input, or network
- an existing API that may live far outside this read (another package or app)

Do not launch extra readers because a file is TypeScript, because tests are in
scope, or because "several files" changed. Extra readers are expensive. Skip
them unless a trigger above is real.

You still own reuse, wrappers, smell, problems, and the review. Extra eyes
are a second read of a gap, not a replacement.

## 2. Extra eyes

Skip unless triage named a gap.

Launch **one** extra reader for that gap. They must not edit. Give them the
scoped paths and what you need judged. Do not tell them how to find the files.

Existing API outside this read → read [reuse.md](reuse.md) and spawn a
read-only generic reader with that file as the prompt.

Do not launch a second reader unless a second trigger also matches and you
cannot cover it yourself.

## 3. Fix

You review and you fix. Do not delegate edits. Follow the nearest project
guide (`AGENTS.md` or equivalent).

Preserve behavior: only **how**, not **what**. Prefer readable, explicit code
over fewer lines. Nested ternaries, dense one-liners, and mashed concerns are
not simpler. A named abstraction that earns its place is keep. A new file or
helper is wrong unless it removes more structure than it adds.

**Always check**

1. **Reuse** — an existing helper, component, or API already does the job →
   call it. No parallel wrapper. Duplicates in scope → keep the better one,
   retarget imports, delete the rest.
2. **Smell** — pass-throughs, extra HTML/JSX, one-off barrels, muddy shape.
   Inline or delete. Do not wrap a wrapper.
3. **Orphans** — unused imports, locals, helpers, exports, files, or
   commented-out blocks **this change** made dead. Grep real uses, including
   dynamic `import()` and string path lookups. Zero uses → delete. Public
   package export without proof → ask. Pre-existing dead outside scope → leave.
4. **Problems** — a defect you already saw (broken emit, silent wrong path,
   leftover after a failed write) → fix this turn. Do not hunt bugs across the
   repo.
5. **Tests in scope** — keep real behavior tests. Delete mock-theater, dupes,
   empty, or greenwash. Do not invent tests for a prod-only change. Do not
   reshape prod to please a weak test.

**Fix vs ask**

- Local, obvious, behavior-preserving → do it. Do not ask "fix or skip?".
- Needs a product call, changes the contract, or is too large to do safely →
  do not edit it. Write a problem heading and the change you would make, then
  wait.
- The whole approach is wrong → one problem heading, the replacement you
  would ship, then wait. Do not nibble.

Tie-break: existing helper > inline > new helper. No edits outside scope.

## 4. Verify

No pass / done / clean claim without a command you ran in **this** turn.
Identify the command → run it full → read exit and failures → then claim.

Use the project's test and lint for the scoped files.

A bug you fixed with no covering test → add a regression test or list
`no test: …`.

## Output

What you fixed, then one heading per leftover problem. Do not emit a
keep / shrink / burn label. Skip the problem headings when nothing is left
unfixed. Do not invent problems to fill the template.

```markdown
**Scope:** <paths>

**Fixed**

- <what you changed>
- none

### <Problem>

<What is wrong, in one or two sentences.>

**Do this:** <the change you would make>

**Checks**

- `<command>` — exit <n>
```

The heading is the problem, not a category. The line under it is the patch
you would apply — a path, an API to call, or the shape to replace. One
recommended action, not a menu.

## Done

The scoped change has no leftover production structure you could remove
locally, obvious defects are fixed, extra eyes ran only for a matching
trigger, verification ran this turn, and every unfixed problem is a heading
plus the change you would make.
