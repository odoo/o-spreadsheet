#!/usr/bin/env python3
"""
Migration script: OWL 2 → OWL 3

Each migration step is an independent function that transforms TypeScript source files.
Run all steps or individual steps as needed.

Usage:
    python migrate_owl2_to_owl3.py [--dry-run] [--step STEP] [--path PATH]

Steps:
    1. useState → proxy
    ... (more steps to come)
"""

import argparse
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path


# ---------------------------------------------------------------------------
# Infrastructure
# ---------------------------------------------------------------------------

@dataclass
class MigrationResult:
    step: str
    file: Path
    changed: bool
    original: str
    modified: str
    diff_lines: list[str] = field(default_factory=list)

    def __post_init__(self):
        if self.changed:
            self.diff_lines = _make_diff(self.original, self.modified, self.file)


def _make_diff(original: str, modified: str, path: Path) -> list[str]:
    import difflib
    return list(difflib.unified_diff(
        original.splitlines(keepends=True),
        modified.splitlines(keepends=True),
        fromfile=f"a/{path}",
        tofile=f"b/{path}",
    ))


def run_step(
    step_name: str,
    transform_fn,
    files: list[Path],
    dry_run: bool,
) -> list[MigrationResult]:
    """Apply *transform_fn* to each file and optionally write changes."""
    results = []
    for path in files:
        original = path.read_text(encoding="utf-8")
        modified = transform_fn(original)
        changed = modified != original
        result = MigrationResult(step_name, path, changed, original, modified)
        if changed and not dry_run:
            path.write_text(modified, encoding="utf-8")
        results.append(result)
    return results


def print_results(results: list[MigrationResult], dry_run: bool) -> None:
    changed = [r for r in results if r.changed]
    if not changed:
        print("  No changes.")
        return
    label = "[DRY RUN] Would modify" if dry_run else "Modified"
    for r in changed:
        print(f"  {label}: {r.file}")
        for line in r.diff_lines[:60]:
            print("    " + line, end="")
        if len(r.diff_lines) > 60:
            print(f"    ... ({len(r.diff_lines) - 60} more lines)")
    print(f"\n  Total: {len(changed)} file(s) changed.")


# ---------------------------------------------------------------------------
# Step 1 — useState → proxy
# ---------------------------------------------------------------------------
# OWL2: import { useState } from "@odoo/owl"
#       this.state = useState({ ... })
#       state = useState<MyType>({ ... })
# OWL3: import { proxy } from "@odoo/owl"
#       this.state = proxy({ ... })
#       state = proxy<MyType>({ ... })
# ---------------------------------------------------------------------------

def _step1_transform(source: str) -> str:
    # 1a. Replace `useState` in import statements from "@odoo/owl"
    #     Handles multi-line imports.  We only touch the owl import block.
    source = _replace_in_owl_imports(source, old="useState", new="proxy")

    # 1b. Replace useState( → proxy( in the rest of the file
    source = re.sub(r'\buseState\b', 'proxy', source)

    return source


def _replace_in_owl_imports(source: str, old: str, new: str) -> str:
    """
    Replace an identifier inside the named-import list of any
    `import { ... } from "@odoo/owl"` statement (single- or multi-line).
    """
    # Match:  import { ...possibly multiline... } from "@odoo/owl";
    pattern = re.compile(
        r'(import\s*\{)([^}]*?)(\}\s*from\s*["\']@odoo/owl["\'])',
        re.DOTALL,
    )

    def replace_in_block(m: re.Match) -> str:
        open_brace = m.group(1)
        imports_body = m.group(2)
        close = m.group(3)

        # Replace the identifier as a whole word inside the import list
        new_body = re.sub(rf'\b{re.escape(old)}\b', new, imports_body)
        return open_brace + new_body + close

    return pattern.sub(replace_in_block, source)


STEP1 = ("useState → proxy", _step1_transform)


# ---------------------------------------------------------------------------
# Registry of all steps (in order)
# ---------------------------------------------------------------------------

ALL_STEPS: list[tuple[str, callable]] = [
    STEP1,
    # Future steps go here:
    # STEP2,
    # STEP3,
]


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def collect_ts_files(root: Path) -> list[Path]:
    return sorted(root.rglob("*.ts"))


def main() -> None:
    parser = argparse.ArgumentParser(description="Migrate OWL 2 → OWL 3")
    parser.add_argument(
        "--path",
        type=Path,
        default=Path("src"),
        help="Root directory to scan for TypeScript files (default: src/)",
    )
    parser.add_argument(
        "--step",
        type=int,
        default=None,
        help="Run only step N (1-based). Omit to run all steps.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print diffs without writing any file.",
    )
    args = parser.parse_args()

    files = collect_ts_files(args.path)
    print(f"Found {len(files)} TypeScript file(s) under '{args.path}'.\n")

    steps = ALL_STEPS if args.step is None else [ALL_STEPS[args.step - 1]]

    for i, (name, transform_fn) in enumerate(steps, start=1):
        print(f"=== Step {i}: {name} ===")
        results = run_step(name, transform_fn, files, dry_run=args.dry_run)
        print_results(results, dry_run=args.dry_run)
        print()

    if args.dry_run:
        print("Dry-run complete. No files were written.")
    else:
        print("Migration complete.")


if __name__ == "__main__":
    main()
