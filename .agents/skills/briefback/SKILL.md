---
name: briefback
description: >-
  Always use for software work larger than a quick fix, even when the user does
  not mention Briefback. Follow the ordered delivery loop: Research → Grill →
  Plan → Stage → Review → Commit, skipping only phases whose entry conditions
  are already satisfied and repeating Stage → Review → Commit until the work is
  done.
  Also use when the user invokes Briefback, requests one of its modes, or project
  guidance requires it. Route natural-language requests to the matching mode and
  load only that mode's reference. Do not use for ordinary quick fixes.
license: MIT
---

# Briefback

One entrypoint for an ordered development loop:

```text
Research → Grill → Plan → Stage → Review → Commit
                          ↑                   │
                          └───── Repeat ─────┘
```

## Default behavior

Do not wait for an explicit `/briefback` invocation. For any software change
larger than a quick fix, load Briefback, identify the earliest necessary phase,
and follow the loop from there. The task itself is enough to activate the skill.

The user's words choose the mode; exact command syntax is optional. A request
to “research this first” routes to Research, and “let's grill it” routes to
Grill. Read only the selected reference before acting. Do not preload every
mode.

## Modes

| Mode | Use when | Read |
| --- | --- | --- |
| `research` | An unfamiliar area needs a durable map | [references/research.md](references/research.md) |
| `grill` | Product, scope, or architecture decisions are still open | [references/grill.md](references/grill.md) |
| `plan` | Decisions are settled and work needs a durable sequence of stages | [references/plan.md](references/plan.md) |
| `tdd` | One implementation slice should proceed test-first | [references/tdd.md](references/tdd.md) |
| `review` | A completed stage needs review, refactoring, and fixes | [references/review.md](references/review.md) |
| `handoff` | Unfinished work is moving to a fresh context | [references/handoff.md](references/handoff.md) |
| `document` | Finished work should become durable project documentation | [references/document.md](references/document.md) |

Accept `code-review` as an alias for `review`. Commands may include a target or
brief in the same request, such as `$briefback research authentication` or
`/briefback review the current diff`.

`continue` and `implement` resume delivery rather than load another playbook.
Read the current plan and latest handoff when they exist, then implement only
the first unchecked stage. Without a plan, use the confirmed reading from the
conversation or handoff. Load [references/tdd.md](references/tdd.md)
only when the user or project requires test-first work.

## Routing

- An explicit mode wins. Read its reference and follow it.
- A clearly implied mode is equivalent to an explicit one. Do not ask the user
  to repeat the request as a command.
- A request to run the whole workflow starts at the earliest necessary phase.
  Skip Research when the area is already understood. Skip Plan when the work is
  obvious enough to hold in the conversation, including one or two compact
  stages across multiple areas. Load later references only when their phase
  begins.
- With no mode or actionable request, inspect the conversation and existing
  `.briefback/` artifacts, then recommend the next mode. Do not begin a
  substantial phase merely because it might be useful.
- If two modes genuinely fit and lead to different immediate work, ask one
  short question. Otherwise choose the narrower mode.

## Shared rules

- Follow the nearest project guide (`AGENTS.md` or equivalent).
- Preserve the user's scope and authority. A mode changes the method, not what
  actions are authorized.
- Keep research, plans, and handoffs under one
  `.briefback/<feature>/` slug so later phases can find them.
- Settle decisions before implementation. Use Plan only when sequencing, scope
  tracking, or handoff needs a durable artifact. Implement one coherent stage
  at a time, then review it before committing and starting the next. A stage is
  an execution and review boundary, not necessarily a pull request or release.
- A phase may route to the next phase when its own completion rules say so.
  Read the next reference at that point, not earlier.
