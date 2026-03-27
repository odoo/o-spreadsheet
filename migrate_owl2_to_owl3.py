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
import os
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
    """Apply *transform_fn(path) -> str* to each file and optionally write changes."""
    results = []
    for path in files:
        original = path.read_text(encoding="utf-8")
        modified = transform_fn(path)
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

def _step1_transform(path: Path) -> str:
    source = path.read_text(encoding="utf-8")
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


def _ts_files(root: Path) -> list[Path]:
    return sorted(root.rglob("*.ts"))


STEP1 = ("useState → proxy", _step1_transform, _ts_files)


# ---------------------------------------------------------------------------
# Step 2 — Template directive aliases (t-ref/t-model/t-portal → t-custom-*)
# ---------------------------------------------------------------------------
# OWL3 reserves these directive names for signals-based usage.
# The compatibility layer exposes t-custom-ref / t-custom-model / t-custom-portal
# so that OWL2-style code keeps working during the migration.
#
# Rules:
#   t-ref="..."           → t-custom-ref="..."
#   t-ref="{{expr}}"      → t-custom-ref="{{expr}}"   (dynamic refs)
#   t-model="..."         → t-custom-model="..."
#   t-model.trim="..."    → t-custom-model.trim="..."  (modifiers preserved)
#   t-portal="..."        → t-custom-portal="..."
#
# Applied to: *.xml  +  *.ts  (inline xml`` templates)
# Skipped:    the compatibility layer itself (owl3_compatibility_layer.ts)
# ---------------------------------------------------------------------------

# Directives that take `=` directly (no modifiers)
_EXACT_DIRECTIVES = ["t-ref", "t-portal"]
# Directives that may have dot-modifiers before `=`
_PREFIX_DIRECTIVES = ["t-model"]

_SKIP_FILES = {"owl3_compatibility_layer.ts"}


def _step2_transform(path: Path) -> str:
    source = path.read_text(encoding="utf-8")
    # t-ref= and t-portal= are always followed immediately by `=`
    for directive in _EXACT_DIRECTIVES:
        source = re.sub(
            rf'\b{re.escape(directive)}(?==)',
            f"t-custom-{directive[2:]}",
            source,
        )

    # t-model may be followed by `=` or `.modifier=`
    for directive in _PREFIX_DIRECTIVES:
        source = re.sub(
            rf'\b{re.escape(directive)}(?=[.=])',
            f"t-custom-{directive[2:]}",
            source,
        )

    return source


def _step2_files(root: Path) -> list[Path]:
    xml_files = sorted(root.rglob("*.xml"))
    ts_files = [
        p for p in sorted(root.rglob("*.ts"))
        if p.name not in _SKIP_FILES
    ]
    return xml_files + ts_files


STEP2 = ("t-ref/t-model/t-portal → t-custom-*", _step2_transform, _step2_files)


# ---------------------------------------------------------------------------
# Step 3 — useEffect (owl) → useLayoutEffect (owl3_compatibility_layer)
# ---------------------------------------------------------------------------
# OWL3 removed useEffect; the compatibility layer re-exports useLayoutEffect
# as a drop-in replacement with equivalent semantics for the migration.
#
# Per file:
#   1. Remove `useEffect` from the `@odoo/owl` named-import list.
#      If the list becomes empty, remove the whole import statement.
#   2. If a `useLayoutEffect` import from the compat layer already exists,
#      add `useLayoutEffect` to it; otherwise insert a new import line
#      right after the last `@odoo/owl` import block, using a path relative
#      to the file being transformed.
#   3. Replace every `useEffect(` call with `useLayoutEffect(`.
#
# Applied to: *.ts  (skipping the compatibility layer itself)
# ---------------------------------------------------------------------------

_COMPAT_LAYER_NAME = "owl3_compatibility_layer"
# Absolute path of the compat layer (no .ts extension, as used in imports)
_COMPAT_LAYER_PATH = Path("src") / _COMPAT_LAYER_NAME


def _relative_compat_import(ts_file: Path) -> str:
    """Return the relative import path (no extension) from *ts_file* to the compat layer."""
    rel = os.path.relpath(_COMPAT_LAYER_PATH, ts_file.parent)
    # os.path.relpath uses OS separator; normalise to forward slashes
    rel = rel.replace(os.sep, "/")
    # Ensure the path starts with ./ or ../
    if not rel.startswith("."):
        rel = "./" + rel
    return rel


def _step3_transform(ts_file: Path) -> str:
    source = ts_file.read_text(encoding="utf-8")
    # Skip if useEffect is not present at all
    if not re.search(r'\buseEffect\b', source):
        return source

    compat_import = _relative_compat_import(ts_file)

    # 1. Remove `useEffect` from the @odoo/owl import block
    owl_import_re = re.compile(
        r'(import\s*\{)([^}]*?)(\}\s*from\s*["\']@odoo/owl["\'];?[ \t]*\n?)',
        re.DOTALL,
    )

    def remove_use_effect(m: re.Match) -> str:
        open_brace = m.group(1)
        body = m.group(2)
        close = m.group(3)

        # Remove `useEffect` entry (with surrounding comma / whitespace)
        new_body = re.sub(r',?\s*\buseEffect\b\s*,?', _clean_comma, body)

        # If the import list is now empty (only whitespace/newlines left), drop the whole line
        if not re.search(r'\w', new_body):
            return ""
        return open_brace + new_body + close

    source = owl_import_re.sub(remove_use_effect, source)

    # 2a. If compat layer is already imported, add useLayoutEffect to it
    existing_compat_re = re.compile(
        r'(import\s*\{)([^}]*?)(\}\s*from\s*["\']' + re.escape(compat_import) + r'["\'];?)',
        re.DOTALL,
    )
    if existing_compat_re.search(source):
        def add_to_existing(m: re.Match) -> str:
            body = m.group(2)
            if re.search(r'\buseLayoutEffect\b', body):
                return m.group(0)  # already there
            # Append before the closing brace, respecting existing formatting
            stripped = body.rstrip()
            sep = ",\n  " if "\n" in body else ", "
            new_body = stripped + sep + "useLayoutEffect" + body[len(stripped):]
            return m.group(1) + new_body + m.group(3)
        source = existing_compat_re.sub(add_to_existing, source)

    # 2b. Otherwise insert a new import line after the last @odoo/owl import
    elif not re.search(r'\buseLayoutEffect\b', source):
        # Find the end of the last owl import block
        last_owl_match = None
        for m in owl_import_re.finditer(source):
            last_owl_match = m
        if last_owl_match:
            insert_pos = last_owl_match.end()
            new_import = f'import {{ useLayoutEffect }} from "{compat_import}";\n'
            source = source[:insert_pos] + new_import + source[insert_pos:]

    # 3. Replace useEffect( → useLayoutEffect(
    source = re.sub(r'\buseEffect\b', 'useLayoutEffect', source)

    return source


def _clean_comma(m: re.Match) -> str:
    """
    Called when removing `useEffect` from a comma-separated import list.
    Preserve exactly one comma between the remaining neighbours.
    """
    full = m.group(0)
    leading_comma = full.lstrip().startswith("useEffect") is False and "," in full[:full.index("useEffect")]
    trailing_comma = "," in full[full.index("useEffect") + len("useEffect"):]
    # If both neighbours exist, keep one comma+space; otherwise nothing
    if leading_comma and trailing_comma:
        return ","
    return ""


def _step3_files(root: Path) -> list[Path]:
    return [
        p for p in sorted(root.rglob("*.ts"))
        if p.name not in _SKIP_FILES
    ]


STEP3 = ("useEffect → useLayoutEffect (compat layer)", _step3_transform, _step3_files)


# ---------------------------------------------------------------------------
# Registry of all steps (in order)
# ---------------------------------------------------------------------------

ALL_STEPS: list[tuple] = [
    STEP1,
    STEP2,
    STEP3,
    # Future steps go here:
    # STEP3,
]


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Migrate OWL 2 → OWL 3")
    parser.add_argument(
        "--path",
        type=Path,
        default=Path("src"),
        help="Root directory to scan for files (default: src/)",
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

    steps = ALL_STEPS if args.step is None else [ALL_STEPS[args.step - 1]]

    for i, (name, transform_fn, collect_fn) in enumerate(steps, start=1):
        files = collect_fn(args.path)
        print(f"=== Step {i}: {name} ({len(files)} file(s)) ===")
        results = run_step(name, transform_fn, files, dry_run=args.dry_run)
        print_results(results, dry_run=args.dry_run)
        print()

    if args.dry_run:
        print("Dry-run complete. No files were written.")
    else:
        print("Migration complete.")


if __name__ == "__main__":
    main()
