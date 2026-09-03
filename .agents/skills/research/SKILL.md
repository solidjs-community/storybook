---
name: research
description: >-
  Use when an area, technology, or landscape must be mapped before changing
  code, or when findings need to survive compaction or a fresh chat. Not for a
  one-file lookup.
license: MIT
---

# Research

Learn how an area works and leave a map that another chat can use without
repeating the investigation. Research only. Do not plan or implement the change.

The user can ask for research in a regular prompt. Use this skill when the
findings should survive context compaction or move to another chat.

## Output

Write to:

```text
.agentflow/<slug>/research/
├── index.md
└── <topic>.md
```

Use a short kebab-case slug for the feature or question. Reuse the directory
when continuing the same research.

`index.md` is a short map, not the full report. It contains:

- the question and scope
- a short summary
- links to every topic page
- the important files, modules, or sources
- open questions that research could not answer

Split detailed findings by domain, module, flow, or independent question. Each
topic page owns one coherent area and must make sense when attached to a chat on
its own. If a later chat could use one part without the others, put that part in
its own file.

Keep a narrow investigation in `index.md` instead of creating empty pages. For
larger research, keep details out of `index.md` and link to the topic pages.

Write the notes in the user's language.

## Research the code

When the question is about an existing project:

1. Read the nearest project guide (`AGENTS.md` or equivalent) and the
   repository's exploration rules.
2. Try the current behavior when possible.
3. Find the entry points, public interfaces, modules, and data flow.
4. Follow the important path end to end. Verify call graph guesses with text
   search.
5. Record exact file paths and symbol names with one line explaining each role.
6. Capture constraints, gotchas, and existing APIs that later work should reuse.

Do not dump search results or source code. Explain how the pieces connect.
Separate what you observed from what you inferred.

## Research a technology

When the question is about a library, platform, or approach:

1. Check the version and setup used by the project.
2. Search the web and read current primary documentation and official sources.
3. Find the APIs and constraints relevant to the question.
4. Connect the findings back to the project's files and current architecture.
5. Record dated source links.

The result should explain what applies here, not summarize the entire
technology.

## Research a landscape

When comparing tools, competitors, or options:

1. State the question and the filter used to keep or reject candidates.
2. Record what the project already has.
3. Open current primary sources and date the snapshot.
4. Explain why each kept option fits the question.
5. Name rejected options and the reason.
6. End with ranked next moves when the user asked what to adopt or build.

A catalog dump is not research. Every item must help answer the question.

## Suggested page shape

```markdown
# <Topic>

## Summary

<What a later chat needs to know>

## How it works

<Behavior or flow>

## Relevant files and modules

- `path/to/file.ts` — role

## Constraints

- <constraint or gotcha>

## Sources

- <dated primary source>

## Open questions

- <unanswered question>
```

Use only the sections that fit the topic.

## Done

Research is complete when a fresh chat can answer these questions from the
notes:

1. How does this area work?
2. Where are the important files, modules, or sources?
3. What constraints will affect the work?
4. What is still unknown?

Print the path to `index.md` and a short takeaway. Do not paste the full notes
into the reply.
