---
name: review-pr
description: Review a PR or commit in the o-spreadsheet codebase for correctness, bugs, performance, security, architecture, tests, and maintainability. Use when user asks to review a PR, review code, review a commit, or mentions "review".
---

# PR Review for o-spreadsheet

## Invocation

The user provides a PR number, branch, or commit. If none given, ask the user.

## Process

### 1. Gather the diff

- **PR number**: `gh pr diff <number>`
- **Branch**: `git diff <base_branch>...HEAD`, the dev branch is always prefixed with the base branch. For example, if the base branch is `19.0`, the dev branch will be `19.0-feature-xyz`.
- **Commit**: `git show <sha>`

List all changed files. Group them by category: plugins, components, stores, functions, tests, types, helpers, registries, other.

### 2. Read every changed file in full

Do NOT review only the diff. Read each changed file completely to understand surrounding context. Also read related test files and type definitions.

### 3. Review with the checklist

For each changed file, evaluate against the checklist in [CHECKLIST.md](CHECKLIST.md). Track every finding with a severity level.

### 4. Output the review

Use this format:

```
## PR Review: <title>

### Summary
<1-2 sentences on what this PR does>

### Findings

#### <filename>:<line> — <severity> — <category>
<description of the issue and suggested fix>

...

### Verdict
<APPROVE / REQUEST_CHANGES / COMMENT>
<brief rationale>
```

## Severity levels

| Level       | Meaning                                                                             | Examples                                                                                |
| ----------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **blocker** | Must fix before merge. Incorrect behavior, data loss, security hole, crash.         | Wrong command handling, XSS via unsanitized input                                       |
| **warning** | Should fix. Performance issue, fragile pattern, missing test coverage for key path. | O(n^2) in hot loop, no undo/redo test, direct state mutation without `history.update()` |
| **nit**     | Optional. Style, naming, minor simplification.                                      | comment typo                                                                            |

## When reviewing, be precise

- Quote the exact code that is problematic.
- Explain **why** it's wrong, not just **what** is wrong.
- Suggest a concrete fix when possible.
- If unsure, say so — don't invent issues.
- Don't flag things that are clearly intentional or match existing codebase patterns.
