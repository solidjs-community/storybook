---
name: handoff
description: >-
  Use when an implementation PR is done and unfinished work will continue in a
  fresh chat, or when context is about to be compacted and the next slice needs
  a durable baton. Not for mid-grill notes.
license: MIT
---

# Handoff

Use this after an implementation PR when the next slice will continue in a
fresh chat. Write a file the next chat can attach. The handoff + plan are
the durable source of truth.

Loop: repo-root `AGENTFLOW.md`.

## Steps

1. **Find the plan.** Path the user named, the last handoff, or the plan in this
   thread.
2. **This PR.** What shipped (paths, commit hash if any). Done-when met or not.
3. **Bleed.** Work that belongs to a later PR but landed, or should have.
   Fold it into the plan: check off this PR, rewrite later PRs. Do not leave
   the next chat to discover leftover files.
4. **Next PR.** Title + done-when from the updated plan. One PR only.
5. **Write** `.agentflow/<slug>/handoff.md` (create dirs). Reuse the same slug
   for the feature so the next chat overwrites this file. Not OS temp.
6. **Print** the path and what the fresh chat should attach.

Redact secrets. Do not paste diffs or long spec bodies — point at paths.

If the user passed a focus, that is the next chat’s Next PR.

## File

```markdown
# Handoff: <slug>

> Next chat: read this file and the plan. Implement **only** Next PR.
> Do not resurrect discarded approaches from a chat summary.

## Plan

path: <file the next chat can open>
sync: updated | unchanged

## This PR

<title>
done when: <criterion> — met | not met
shipped: <paths, commit if any>

## Bleed

<what leaked into / out of later PRs, and how the plan changed>
none

## Next PR

<title>
done when: <criterion>
suggested: tdd / code-review / craft skills for the next slice
```

## Done

Handoff is complete when `.agentflow/<slug>/handoff.md` exists, the plan matches
what shipped, Next PR is one heading, and the printed path is what the fresh chat
should attach.
