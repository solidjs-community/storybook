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

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled. Ask the whole frontier in one round as ordinary chat text: number each question and give your recommended answer. Then wait. Do not also invoke a host questionnaire, picker, or any extra tool that re-asks the same questions — hosts differ, and that second channel duplicates the round.

```
❓ **Q1** - **<title>**

<body: facts and constraints only. No options here.>

- **(a)** <one approach>
- **(b)** <one approach>
- **(c)** <one approach>

➡️ **(a)** — <why this one>
```

Each option is its own list item: one letter, one approach. Never put two
letters in the same paragraph, and never inline `(a)` `(b)` `(c)` in the
question body.

A question with no discrete approaches omits the list: body, then ➡️.

```
❓ **Q2** - **Where the worker runs**

The job can take 20 minutes. The HTTP request cannot.

- **(a)** One call: start and wait until done; heartbeat so the worker is not reaped
- **(b)** Start returns a job id; a second tool polls
- **(c)** One tool, wait by default, `wait=false` to return the id

➡️ **(a)** — One tool, like the button. Same timeout as the job.
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

The frontier is empty and every branch has been visited. Restate the settled
list as bullets — what we will do, not the discarded options. Wait for the
user to confirm that list. Nothing is silently assumed. Do not implement
before this confirmation.

```
**Settled**
- <confirmed answer>
- <confirmed answer>
```

After confirmation, choose the next step. Do not ask which skill to run next.

- A native planning flow is already open → continue there.
- The confirmed work needs durable coordination across several stages,
  non-obvious dependencies, or a likely context handoff → read
  [plan.md](plan.md) and write the plan in this chat. The settled list becomes
  **Decisions** in the plan; do not leave it only in this reply.
- The work is obvious enough for one or two compact stages → keep the settled
  list in this chat and offer to implement it next. Do not create a plan only
  because the change crosses backend, frontend, or other project areas.
