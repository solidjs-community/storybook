---
name: grill
description: Relentless interview to sharpen a plan or design until every branch is resolved.
license: MIT
---

# Grill

Interview until you reach a shared understanding. Map the work as a **design tree**: every decision branches into the decisions that hang off it.

Use this for non-trivial product/architecture calls. Do not grill a one-line fix.

Do **not** create extra docs, ADRs, or tickets as you go. Capture settled
decisions in the reply; if a lasting convention belongs in the project's
agent guide, say so and wait for the user to ask you to write it.

## Rounds

Start by restating the task, the decisions already implied by the request, and
any assumptions you would otherwise make. If there are no open questions, ask
the user to confirm this reading.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled. Ask the whole frontier in one round: number each question and give your recommended answer. Then wait.

```
❓ **Q1** - **<title>**: <body, including choices>

➡️ <your recommended answer>

---

❓ **Q2** - **<title>**: <body>

➡️ <your recommended answer>
```

Each round of answers reshapes the tree. Recompute the frontier. A question that depends on another still open in this round belongs to a _later_ round.

## Facts vs decisions

Finding _facts_ is your job. When a frontier question needs something from the
repo, look it up — don't ask the user for anything you can read. Follow the
nearest project guide (`AGENTS.md` or equivalent). A running lookup is an
unsettled prerequisite: ask the rest of the frontier now.

The _decisions_ are the user's. Put each to them and wait.

Push back when a simpler approach fits. Name blockers instead of designing
around them. Recommend the project's default unless the user has a reason not
to. If the guide is silent, prefer the smallest change that matches nearby
code.

## Done

The frontier is empty, every branch has been visited, and the user has confirmed
the final reading. Nothing is silently assumed. Do not implement before this
confirmation.

After confirmation, continue the loop yourself. Do not ask which skill to run
next.

- A native planning flow is already open → continue there.
- The confirmed work needs more than one shippable slice → load `plan` and
  write it in this chat.
- One small slice is enough → implement that slice.
