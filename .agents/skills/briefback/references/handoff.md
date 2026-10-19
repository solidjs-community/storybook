# Handoff

Use this after an implementation stage when the next stage will continue in a
fresh chat. Write a file the next chat can attach. The handoff, plus the plan
when one exists, is the durable source of truth.

Loop: repo-root `BRIEFBACK.md`.

## Steps

1. **Find the context.** Use the plan the user named, the last handoff, or the
   confirmed reading in this thread. A plan is optional.
2. **This stage.** What shipped (paths, commit hash if any). Done-when met or
   not.
3. **Bleed.** Work that belongs to a later stage but landed, or should have.
   Fold it into the plan when one exists: check off this stage and rewrite
   later stages. Do not leave the next chat to discover leftover files.
4. **Next stage.** Title + done-when from the updated plan or confirmed reading.
   One stage only.
5. **Write** `.briefback/<slug>/handoff.md` (create dirs). Reuse the same slug
   for the feature so the next chat overwrites this file. Not OS temp.
6. **Print** the path and what the fresh chat should attach.

Redact secrets. Do not paste diffs or long spec bodies — point at paths.

If the user passed a focus, that is the next chat’s Next stage.

## File

```markdown
# Handoff: <slug>

> Next chat: read this file and the plan when present. Implement **only** Next stage.
> Do not resurrect discarded approaches from a chat summary.

## Plan

path: <file the next chat can open | none>
sync: updated | unchanged | not used
scope: <confirmed reading; required when path is none>

## This stage

<title>
done when: <criterion> — met | not met
shipped: <paths, commit if any>

## Bleed

<what leaked into / out of later stages, and how the plan changed>
none

## Next stage

<title>
done when: <criterion>
suggested: Briefback tdd / review, plus project craft skills for the next slice
```

## Done

Handoff is complete when `.briefback/<slug>/handoff.md` exists, the plan matches
what shipped when one exists, Next stage is one heading, and the printed path is
what the fresh chat should attach.
