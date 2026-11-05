# Code review

Review a finished stage, refactor avoidable structure, and fix defects. This is
not a lint pass: working code can still need structural changes. Ask the user
only when the call needs a product or design decision.

Review in order: correctness, safety, expected load, tests, speed, and simplicity.

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

## Understand

Read the diff, then the affected callers, dependencies, and tests. Trace the
changed flow from input through storage to output. When a signature, return
value, or behavior changes, check every affected caller, including unchanged
code. Follow the project's exploration rules.

Use relevant docs and runtime or deploy config to establish expected data size,
concurrency, and process count. Judge scale against that evidence; state an
assumption when it affects a fix or finding. Do not design for imaginary load.

## Fix

You review and you fix. Follow the nearest project guide (`AGENTS.md` or
equivalent).

Refactors preserve behavior; bug fixes restore intended behavior established by
the brief, contracts, or tests. Do not equate a safe review with a minimal diff.
If the implementation works but its structure is harder to follow than nearby
code, refactor it now. A refactor may rename, extract, inline, move responsibilities
across affected files, consolidate duplicates, or replace the implementation
shape when contracts and behavior stay intact.

Balance lines maintained with effort to understand the flow: nesting, branches,
state held in mind, and jumps between helpers or files. Fewer lines help when
they remove work or repetition; dense expressions that hide steps do not.

Extract when a helper removes meaningful duplication, isolates a distinct job,
or gives a useful name to logic the reader can then treat as one step. Keep
straight-line steps together when splitting them adds names, parameters, and
jumps without making the flow easier to follow. A one-line helper can earn its
place through reuse or domain meaning; wrapping an obvious expression usually
does not. Split by responsibility, never by line count. When both forms are
equally clear, keep the one with fewer lines and moving parts. Prefer the
smallest refactor that fully resolves the problem, not the smallest edit.

**Always check**

1. **Correctness** — trace changed behavior for wrong results, crashes, edge
   cases, and broken callers. Check shared owners when a fix covers only one
   caller. Fix defects in the affected flow; do not hunt across unrelated code.
2. **Safety** — check input validation, authorization, injection, secrets, and
   failure paths where relevant. Look for swallowed errors, partial writes,
   wrong write order, and missing atomicity that could lose or corrupt data.
   For retryable writes, check duplicate delivery and restart after partial
   completion: neither should repeat an unintended side effect.
3. **Load and speed** — check races, work repeated by every process, state
   that should be shared, growing memory, queries per item, and costly loops.
   Before adding locks, check whether mutable state needs to be shared at all.
   Where it does, make write ownership explicit.
   Fix demonstrated slowdowns and failures at expected load; do not add
   speculative infrastructure or optimize without a concrete cost.
4. **Reuse** — search the repo for each new helper, component, or copied
   pattern. Prefer shared libraries and the same package. An existing API
   already does the job → call it. No parallel wrapper. Duplicates in scope →
   keep the better one, retarget imports, delete the rest.
5. **Smell** — pass-throughs, extra HTML/JSX, one-off barrels, muddy shape.
   Inline, move, consolidate, or delete. Check whether responsibilities live in
   the module that owns them. Prefer a data shape that rules out invalid
   combinations over scattered corrective checks. Parse external data at its
   boundary; avoid repeating validation of established internal invariants.
   Do not wrap a wrapper.
6. **Orphans** — unused imports, locals, helpers, exports, files, or
   commented-out blocks **this change** made dead. Grep real uses, including
   dynamic `import()` and string path lookups. Zero uses → delete. Public
   package export without proof → ask. Pre-existing dead outside scope → leave.
7. **Tests in scope** — check that risky new branches, parsers, authorization,
   and data writes have tests that fail when behavior breaks. Add focused
   coverage where needed, not tests that mirror implementation or chase a
   coverage number. Keep real behavior tests; delete mock-theater, dupes,
   empty, or greenwash. Ask whether a no-op implementation or wrong result
   would still pass. Assert outcomes through the consumer's interface.
   Do not reshape prod to please a weak test.

Before fixing or reporting a suspected defect, confirm the concrete input or
situation, the path that reaches it, and the wrong result. Re-read the code and
verify the assumptions. Fix the cause rather than hide its symptom with a
fallback. When repeated fixes fail the same check, revisit their shared
assumption before adding another workaround.

Structural changes need a concrete benefit under the readability rules above,
not a style preference. Respect a documented shortcut
while its assumptions and stated limits still hold; check them against the
stage and expected use.

**Fix vs leave**

- A confirmed defect with established intended behavior, or a behavior-preserving
  improvement, verifiable inside the stage → fix it now, even across several
  affected files. Do not return an actionable list instead of safe fixes.
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
for hypothetical improvements. After checking behavior, safety, and expected
load, if the structure fits and verification supports the stage, say so and
stop. Do not refactor to prove the review was active.

## Verify

No pass / done / clean claim without a command you ran in **this** turn.
Identify the command → run it full → read exit and failures → then claim.

Use the project's test and lint for the scoped files.

Before a refactor, establish the behavior to preserve. Use existing checks;
add focused characterization coverage only where needed. Verify each coherent
structural change before building on it.

A bug you fixed with no covering test → add a regression test or list
`no test: …`.

## Output

This is the whole return. Plain English, short sentences. **Assessment** is
required and states the quality and structural conclusion, not the review trail.
Explain unfamiliar terms when needed. Give unresolved problems a source location,
concrete consequence, and smallest sufficient fix. Put the most serious first.

```markdown
### Assessment

<What the change does, remaining risks, and whether a broader refactor was warranted.>

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
out of the reply. If something material could not be checked, add one
`Not checked: …` line. State load assumptions only when they affect the result.

## Done

The assessment states the quality conclusion and whether the structure warranted
a broader refactor. Safely verifiable defects and avoidable production structure
in scope are fixed, including problems that need a multi-file behavior-preserving
refactor. Verification ran this turn, and every worthwhile improvement left
outside the safe scope is a follow-up or decision with how to address it.
