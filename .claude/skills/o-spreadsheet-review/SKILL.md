---
name: o-spreadsheet-review
description: Deep multi-agent code review of a branch in the o-spreadsheet repo. Fans out by dimension, verifies every finding, then writes a failing test for each one in the best existing test file. Terminal-only, no network. Use when the user asks to review a branch or "this branch".
---

# Review

Offline review of an o-spreadsheet branch. Everything comes from the local git checkout and the local test suite.

## Arguments

`/review [branch] [--quick]`

| Argument  | Meaning                                                                     |
| --------- | --------------------------------------------------------------------------- |
| `branch`  | Omitted → current branch. Otherwise a branch name to check out.              |
| `--quick` | Single-pass review: skip the fan-out and the verify pass. Tests are still written. |

## Hard rules

- **No network.** Never run `gh`, `git fetch`, `git push`, `git pull`, `curl`, or anything else that reaches out. This environment has no access, and the review must never depend on one. Work from local refs only.
- **Post nothing, anywhere.** The output is markdown in this terminal plus test files written to the working tree. If the user asks for findings on GitHub, say this skill cannot do that.
- **Never commit.** Leave every change in the working tree for the user to inspect.

## 1. Resolve the range

- **Branch given** → check it out if it differs from the current branch. If the tree is dirty or checkout fails, stop and ask.
- **Omitted** → use the current branch.
- A PR number is not a valid target here — there is no `gh`. Ask the user for the branch name.

Derive `<base>` from the branch name: a dev branch is prefixed with its base, so `19.0-feature-xyz` → `19.0` and `master-fix-foo-abc` → `master`.

Resolve it against local refs, **remote-tracking ref first**:

1. A remote-tracking ref ending in `/<base>` — `git for-each-ref --format='%(refname:short)' refs/remotes | grep -E '/<base>$'` (e.g. `stable/master`). Prefer this always: the branch will be merged into upstream, so upstream is what it must be reviewed against.
2. Only if none exists, the local branch `<base>`.

A local `<base>` is a personal working copy — it lags until pulled, and it may carry commits upstream has never seen. Either moves the merge base and drags unrelated commits into the diff.

If the two disagree, use the remote-tracking ref and say so in the report: `base <ref> (local <base> differs by N commits)`. If no ref matches, or you cannot infer the base, stop and ask.

The ref is only as fresh as the user's last fetch, and this skill cannot fetch. If the commit count below looks implausible, say so — a stale base is the usual cause.

Sanity-check before reviewing: `git log --oneline <base>..HEAD | wc -l`. If it is empty or implausibly large (> ~60 commits), stop and ask.

Use three dots — `git diff <base>...HEAD` — so the diff is against the merge base, not the tip of a base branch that may have moved far ahead.

## 2. Commit hygiene

Walk `git log --oneline <base>..HEAD` oldest → newest. For each, read `git show <sha>` and check:

- One concern per commit, clear single purpose.
- Odoo-convention message (`[FIX]`, `[IMP]`, `[REF]`, `[PERF]`, `[MOV]`, `[REL]`) that accurately describes the change.
- The commit stands on its own — it does not depend on a later commit to build or keep tests green. **Blocker** if it leaves the tree broken.
- No unrelated changes, no leftover debug code.
- New behavior or fix lands with its tests in the same commit.

Cheap — do it inline, not in a subagent.

## 3. Fan out (skip if `--quick`)

Spawn one `general-purpose` agent per dimension below, **all in a single message so they run concurrently**. Scale down for small diffs — drop dimensions the diff plainly does not touch.

| Agent             | Scope                                                                       |
| ----------------- | --------------------------------------------------------------------------- |
| `correctness`     | Logic, edge cases, command state transitions, bounds, shared-object mutation |
| `model-integrity` | undo/redo, collaborative, ranges, duplicate sheet, migrations, import/export |
| `architecture`    | Plugin category and scopes, layering, stores vs plugins, registries          |
| `performance`     | Hot paths: rendering, evaluation, large-range operations                     |
| `tests`           | Coverage of new behavior, undo/redo and collab tests, determinism            |
| `translations`    | `_t()` rules, `.translate` directives                                        |
| `security`        | XSS from unsanitized input, `new Function`/`eval` on user-controlled data    |
| `maintainability` | Clarity, naming, precise types, dead code, consistency with existing patterns |

Give every agent the same preamble:

> You are reviewing a branch of o-spreadsheet (an Owl-based spreadsheet component). Read `CLAUDE.md` and `.claude/skills/o-spreadsheet-review/CHECKLIST.md` first. Review `git diff <base>...HEAD` for the **<dimension>** section of that checklist only.
>
> Do not review from the diff alone. For each changed region, read enough code at HEAD — the enclosing function, the call sites, the related types and tests — to know what the change actually does.
>
> You have no network access. Do not run `gh` or any fetch.
>
> Report only real problems in the changed code. Return nothing rather than padding: an empty list is a perfectly good result. Do not flag anything that is clearly intentional or that matches an existing pattern in the codebase.
>
> For each finding return exactly: `file:line` · severity (blocker/warning/nit) · one sentence on what is wrong · one concrete fix. No preamble, no restating the code.

## 4. Verify (skip if `--quick`)

Pool every candidate finding — blockers, warnings **and** nits — then spawn verifier agents, batching ~4 findings each, **max 6 agents, single message**. Do not tell a verifier which dimension a finding came from.

> For each finding below, try to **disprove** it. Read the actual code at HEAD, the call sites, and the tests. Return per finding: `CONFIRMED` (the problem is real and reachable) / `PLAUSIBLE` (real risk, but you could not prove it reachable) / `REJECTED` (not a problem — the guard exists elsewhere, it is intentional, the premise is wrong), plus one sentence of evidence.

Drop every `REJECTED` finding silently — never mention them, never list what was filtered. Mark `PLAUSIBLE` ones as such so the reader can weigh them.

## 5. Write a failing test for each finding

A finding with a failing test is a finding someone can fix. Do this for every surviving finding whose behaviour is observable.

**Where.** Put each test in the **best existing test file** — the one that already covers that production file or feature (`tests/borders/border_plugin.test.ts` for the borders plugin, `tests/xlsx/xlsx_import_export.test.ts` for roundtrips, `tests/helpers/` for a helper, and so on). Add it to the `describe` block it belongs in. Only create a new file when nothing existing fits, and say so in the report.

**How.** Follow `.claude/skills/o-spreadsheet-testing/SKILL.md` — no `beforeEach`, use the helpers in `tests/test_helpers/`, test behaviour through getters rather than plugin internals, keep the setup minimal. If a helper cannot express the case, extend the helper rather than reaching for a raw dispatch; if you must dispatch raw, comment why.

**What to assert.** The *correct* behaviour — what the merge base does, or what the feature plainly intends — so the test fails now and passes once the bug is fixed. Name it so the finding is identifiable: `"<file>:<line> — <what should happen>"`.

**Then run it**, and read the failure:

- It must fail **for the reason in the finding**. A test that fails on a typo, a wrong helper signature, or unrelated noise (a `revisionId` that changes on every dispatch, say) proves nothing — fix the test and re-run.
- **If the test passes, the finding is wrong.** Drop it, or demote it to a coverage note: the behaviour works and now has a test guarding it. Do not report it as a defect.

If there are many target files, fan out one agent per file. Each agent must run its own tests and report the actual failure output, not just claim it fails.

**No test possible** for findings with nothing observable to assert — performance regressions (they need a benchmark, not an assertion), duplication, dead exports, naming, style. Do not invent a brittle timing assertion for these. List them in the report with one reason each.

Leave every added test in the working tree, uncommitted.

## 6. Report

**Be ruthlessly brief.** A long review is an unread review.

- One line per finding; two only if truly necessary.
- No restating the code, no "I noticed that…", no closing summary, no recap of what you reviewed.
- Concrete fixes ("use `this.history.update`"), not abstract advice ("consider state management").
- Blockers first, then warnings, then nits. Never drop a finding merely because the list is long,
  and never suppress a nit for being small — it is cheap to skip and cheap to fix.

```
### Commits
<one short line per commit with an issue, or "All commits look clean." and nothing else.>

### Findings

#### <file>:<line> — <severity>
<one line: what is wrong, and the fix.> [plausible]
↳ <test file>::<test name>

### Not covered by a test
<file>:<line> — <one-line reason>

### Coverage notes
<findings whose test passed: the behaviour works, the test now guards it.>
```

End with one line naming the test files touched and warning that the suite is red by design until the fixes land.

If nothing survived verification, say so in one line and stop.

## Severity

| Level       | Meaning                                                                 |
| ----------- | ----------------------------------------------------------------------- |
| **blocker** | Must fix before merge. Wrong behavior, data loss, broken undo or collab. |
| **warning** | Should fix. Perf issue, fragile pattern, missing test on a key path.     |
| **nit**     | Optional. Style, naming, minor simplification.                           |

## Reviewer discipline

Do not invent findings to look thorough. If you are unsure whether something is a real issue, say you are unsure rather than asserting it. A short list of real problems beats a long list padded with nits — the reader's trust is the scarce resource.
