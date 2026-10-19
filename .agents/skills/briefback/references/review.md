# Code review

Review a finished stage, refactor avoidable structure, and fix defects. This is
not a lint pass: working code can still need structural changes. Ask the user
only when the call needs a product or design decision.

## Isolation

Run the review in **one subagent**. The parent chat keeps the brief, not the
review trail.

**Parent.** Brief the subagent, then launch it with this skill's rules:

1. **What changed** — scoped paths, or the git range to diff
2. **Why** — the stage intent (stage briefing, user request, settled constraints
   that affect this diff)

When it finishes, relay its return. Do not re-review.

**Subagent.** You were launched to review. Review, fix, and verify. Return
the assessment and applicable result sections. Do not launch another subagent.

If this client cannot launch a subagent, review in this chat.

## Scope

Paths, symbols, or an area the user named win. A named fixed point (branch,
tag, `main`, PR) → `git diff <fixed>...HEAD` (three-dot), still honor those
paths inside it.

Otherwise: `git diff --no-color` and `git diff --cached --no-color`. No local
diff → files from this conversation. Still nothing → `git show --stat --patch
--no-color HEAD`.

The diff is the starting scope, not a restriction to line-local edits. A
behavior-preserving refactor may reshape the changed code and its directly
affected owners or consumers when that is necessary to leave the stage
coherent. Do not refactor unrelated subsystems or pre-existing debt. Preserve
unrelated user changes.

## Fix

You review and you fix. Follow the nearest project guide (`AGENTS.md` or
equivalent).

Preserve behavior: only **how**, not **what**. Do not equate a safe review with
a minimal diff. If the implementation works but its structure is harder to
follow than nearby code, refactor it now. A refactor may rename, extract,
inline, move responsibilities across affected files, consolidate duplicates,
or replace the implementation shape when contracts and behavior stay intact.

Prefer readable, explicit code over fewer lines. Nested ternaries, dense
one-liners, and mashed concerns are not simpler. A named abstraction that earns
its place is worth keeping. A new file or helper is wrong unless it removes more
structure than it adds. Prefer the smallest refactor that fully resolves the
problem, not the smallest edit.

**Always check**

1. **Reuse** — search the repo for each new helper, component, or copied
   pattern. Prefer shared libraries and the same package. An existing API
   already does the job → call it. No parallel wrapper. Duplicates in scope →
   keep the better one, retarget imports, delete the rest.
2. **Smell** — pass-throughs, extra HTML/JSX, one-off barrels, muddy shape.
   Inline, move, consolidate, or delete. Check whether responsibilities live in
   the module that owns them. Do not wrap a wrapper.
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

**Fix vs leave**

- Behavior-preserving and verifiable inside the stage → do it, even when the
  refactor spans several affected files.
- Needs a product call, changes the contract, reaches an unrelated subsystem,
  or cannot be verified safely → leave it on the decision list.
- The whole implementation shape is wrong but a behavior-preserving replacement
  fits the stage and can be verified → replace it. Otherwise explain the
  replacement you would ship. Do not nibble.

Tie-break: existing helper > inline > new helper. Moving code within the stage
is allowed; unrelated edits are not.

## Stop

Inspect the diff, its ownership boundaries, concrete reuse candidates, and the
tests that prove the stage. Use targeted searches; do not scan unrelated code
for hypothetical improvements. If the structure already fits the surrounding
code, say so in the assessment and stop. Do not refactor to prove the review was
active.

## Verify

No pass / done / clean claim without a command you ran in **this** turn.
Identify the command → run it full → read exit and failures → then claim.

Use the project's test and lint for the scoped files.

A bug you fixed with no covering test → add a regression test or list
`no test: …`.

## Output

This is the whole return. Ordinary sentences. **Assessment** is required and
names the structural conclusion, not the review trail.

```markdown
### Assessment

<What structure was evaluated and whether a broader refactor was warranted.>

### Fixed

- <what you changed and why, one line each>

### Follow-ups

### <Improvement>

<A concrete worthwhile improvement outside the safe review scope, why it
matters, and what to change.>

### Needs a decision

### <Problem>

<What's wrong and why it matters.>

<How to fix it. One obvious change → that change. A call they have to make → the real options and which you'd pick.>
```

Omit **Fixed** when you changed nothing. Omit **Follow-ups** when there is no
concrete worthwhile improvement outside the safe review scope. A safe in-scope
improvement is a fix, not a follow-up. Omit **Needs a decision** when nothing is
left unfixed. The heading is the problem, not a category. Do not invent work.

A check that failed → say which command and what failed. Passed checks stay
out of the reply.

## Done

The assessment states whether the structure warranted a broader refactor. The
stage has no avoidable production structure, including problems that need a
multi-file behavior-preserving refactor. Defects are fixed, verification ran
this turn, and every worthwhile improvement left outside the safe scope is a
follow-up or decision with how to address it.
