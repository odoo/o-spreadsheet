---
name: o-spreadsheet-review
description: Review a branch or PR in the o-spreadsheet project for correctness, bugs, performance, security, architecture, tests, and maintainability. Use when user asks to review code or mentions "review".
---

# Code Review for o-spreadsheet

## Invocation

The user provides a PR number or branch name, or refers to the current branch ("this branch", "my branch"). If none given, ask the user.

> **Note:** The `gh` CLI is not available in this sandboxed environment. Work from the local git checkout only.

## Process

### 1. Make sure the right branch is checked out

The review runs against the **currently checked-out branch**.

- **PR number**: stop and ask the user to confirm the branch name or check it out.
- **Branch name**: if it differs from the current branch, check it out. If checkout fails (dirty tree, unknown branch, …), stop and ask the user.

### 2. Determine the review range

The dev branch is always prefixed with its base branch — e.g. base `19.0` → dev `19.0-feature-xyz`. Derive `<base_branch>` from that prefix; if you cannot infer it, ask the user.

Then list the commits in `<base_branch>..HEAD` — those are the commits to review.

### 3. Walk each commit for hygiene

For every commit in `<base_branch>..HEAD` (oldest → newest), read `git show <sha>` (message + diff) and check:

- One concern per commit — clear, single purpose.
- Commit message follows the Odoo convention (`[FIX]`, `[IMP]`, `[REF]`, `[PERF]`, …) and accurately describes the change.
- Commit builds and keeps tests passing on its own — no commit depends on a later one to be coherent (**blocker** if a commit leaves the tree broken).
- No unrelated changes or leftover debug code.
- New behavior or fix lands with its tests in the same commit.

### 4. Review the branch as a whole

Diff the whole branch (`git diff <base_branch>...HEAD`). For each changed region, read enough surrounding code at HEAD — the enclosing function, the call sites, related types/tests — to actually understand what the change does. Then apply [CHECKLIST.md](CHECKLIST.md) against the merged result.

### 5. Output the review

**Be ruthlessly brief.** A long review is an unread review — if the human has to scroll, they will skim or skip it. Aim for the shortest text that is still actionable:

- One line per finding. Two only if truly necessary.
- No restating the code, no explaining what the function does, no preamble like "I noticed that…".
- Skip findings that aren't worth the reader's time. A short list of real issues beats a long list padded with nits.
- Prefer concrete fixes ("use `history.update`") over abstract advice ("consider state management").
- No closing summary, no recap of what you reviewed.

```
### Commit
<for commits with issues, one short line, or "All commits look clean." and nothing else.>

### Findings

#### <file>:<line> — <severity>
<very short issue description and suggested fix>

```

## Severity levels

| Level       | Meaning                                                                             | Examples                                                                                |
| ----------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **blocker** | Must fix before merge. Incorrect behavior, data loss, security hole, crash.         | Wrong command handling, XSS via unsanitized input                                       |
| **warning** | Should fix. Performance issue, fragile pattern, missing test coverage for key path. | O(n^2) in hot loop, no undo/redo test, direct state mutation without `history.update()` |
| **nit**     | Optional. Style, naming, minor simplification.                                      | comment typo                                                                            |

## Reviewer discipline

Don't flag things that are clearly intentional or match existing codebase patterns. If unsure whether something is a real issue, say so rather than invent one.
