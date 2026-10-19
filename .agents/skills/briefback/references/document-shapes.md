# Shapes

Use the sections that serve the job. Cut the rest.

## Tutorial

Author owns success. One path, no choices, no theory.

- Start state and what "done" looks like
- Numbered steps; each one has something the reader can see
- Known-good end state in under five minutes when that's the brief

## How-to

Assumes they already know the product. A recipe.

- When to use this / the problem
- Prerequisites and access
- Steps to the outcome
- What to do if it fails (runbook: rollback + who to escalate)

## Reference

Describes the machine. Structure follows the product, not a task.

- Accurate, complete, same shape on every entry
- Request/response, flags, errors, limits — examples of the shape
- No "first install X" lesson; link to a tutorial or how-to

## Explanation

A discussion. Context, design, trade-offs, how pieces connect.
Not steps. Not an API list.

## README

- What this is and why it exists
- Quick start (tutorial fragment)
- Links: how-to, reference, contributing — don't inline them

## Split, then link

| Failure                             | Do                       |
| ----------------------------------- | ------------------------ |
| how-to opens with "what is X"       | link an explanation      |
| tutorial offers three install paths | pick one                 |
| reference walks a use case          | that's a how-to; link it |
| architecture has kubectl steps      | that's a runbook         |
