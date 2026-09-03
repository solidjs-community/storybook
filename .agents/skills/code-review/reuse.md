# Reuse hunt

Read-only. Report only.

## Scope

Only the paths the parent named. Confirm a candidate helper exists; do not
wander past that.

## Hunt

For each new helper, util, hook, component, or copied pattern in that diff:
search the repo. Prefer shared libraries and the same package.

Report a **real** match (same behavior). Stretch: one line, then drop it.

A one-off is inline, not a new wrapper. Existing helper > inline > new helper.

## Output

One finding per line, real matches first:

`path:line | existing API to call | what to delete`

No match → one sentence.
