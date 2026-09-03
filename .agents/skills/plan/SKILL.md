---
name: plan
description: >-
  Use when decisions are settled and the work needs ordered PR-sized slices, or
  when an existing plan must be updated after scope bleed. Not grill. Not
  handoff.
license: MIT
---

# Plan

Write **one** plan another developer or agent can pick up.

Open decisions → load `grill`, resume after the user confirms the reading.
One-line or obvious scope skips the plan. Do not implement.

## Where

- **Native planner** (built-in plan UI): plan artifact / reply only. No
  `.agentflow/` files.
- **Otherwise:** `.agentflow/<slug>/plan.md` (kebab-case from the feature;
  reuse the slug). Print the path.
- A plan file already on the branch: update that file.

## Shape

```markdown
# <Feature>

> Keep this plan current during implementation.
> Check a PR only after its done-when and verification pass.
> Record scope changes before leaving the PR.

**Goal:** one sentence
**Approach:** 2–3 sentences — the chosen reading
**Reuse:** existing APIs this plan calls (`path`)

## PR 1 — <title>

- [ ] Complete
  - [ ] <outcome> — change `symbol` in `path`
  - [ ] <outcome> — change `symbol` in `path`

**Files**
- `path` — what changes
- `path` — create: cannot live in `existing` because <reason>

**Done when:** <one observable sentence>
**Verify:** `<command>`

## PR 2 — <title>

- [ ] Complete
  - [ ] <outcome> — change `symbol` in `path`

**Files**
- `path` — what changes

**Done when:** …
**Verify:** `<command>`
```

Nested tasks are progress. Check **Complete** only after done-when and verify
pass. The next PR starts from an unchecked Complete box, not a checked child.

Each PR is the smallest complete, independently shippable change that does one
useful thing and has one clear way to test it. Foundations before consumers.

## Slicing

- **Blocked by shape:** refactor the existing module, then the feature.
- **Contract missing:** add the type or endpoint, then the consumer.
- **Feature:** change the module that owns the behavior. Extract when this plan
  already has a second consumer.
- **Small:** one vertical slice.

A foundation gets its own PR when others can ship against it. Feature-local UI
and wiring stay with their first consumer. Distinct outcomes that can ship
separately get separate PRs. More than five nested tasks → split the PR.

## Rules

- Ground every PR in the files listed under it. A cited path exists, or it is
  `create`.
- One approach. No menu, no TBD, no “handle edge cases”, no “similar to PR n”.
- **Reuse** names the APIs to call. Tasks name the `symbol` in `path` to change.
- Files are edits. A `create` line names the existing file it cannot join.
  A one-call helper, pass-through, barrel, or mapping-only test belongs at the
  call site.
- **Done when** is one observable sentence. **Verify** is the command to run.

## Self-check

1. Every settled decision has a PR or is named out of scope.
2. Every path exists, or `create` names the existing home it cannot join.
3. A person can open PR 1, read its tasks, and ship without this conversation.
4. Every PR leaves the repository working without the next PR to justify it.

## Output

Print the path. The implementer starts with the first PR whose Complete box is
unchecked, in this context or a new one.
