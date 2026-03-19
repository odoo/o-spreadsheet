#!/usr/bin/env python3
"""
make_helpers_async.py

1. Converts sync `export function` declarations in commands_helpers.ts to
   `export async function`.
2. Adds `await` before all non-awaited calls to those functions in:
   - commands_helpers.ts itself (internal calls)
   - every *.ts test file that imports them

Usage:
    python make_helpers_async.py [--dry-run] [--inplace] [--root <dir>]
"""

import argparse
import difflib
import re
import sys
from pathlib import Path


# ---------------------------------------------------------------------------
# Low-level text navigation (same helpers used in script.py)
# ---------------------------------------------------------------------------

def skip_line_comment(src: str, pos: int) -> int:
    while pos < len(src) and src[pos] != "\n":
        pos += 1
    return pos


def skip_block_comment(src: str, pos: int) -> int:
    while pos < len(src) - 1:
        if src[pos] == "*" and src[pos + 1] == "/":
            return pos + 2
        pos += 1
    return len(src)


def skip_string(src: str, pos: int, quote: str) -> int:
    while pos < len(src):
        ch = src[pos]
        if ch == "\\":
            pos += 2
            continue
        if ch == quote:
            return pos + 1
        pos += 1
    return len(src)


def skip_template_literal(src: str, pos: int) -> int:
    while pos < len(src):
        ch = src[pos]
        if ch == "\\":
            pos += 2
            continue
        if ch == "`":
            return pos + 1
        if ch == "$" and pos + 1 < len(src) and src[pos + 1] == "{":
            pos = skip_balanced_braces(src, pos + 2)
            continue
        pos += 1
    return len(src)


def skip_balanced_braces(src: str, pos: int) -> int:
    depth = 1
    while pos < len(src) and depth > 0:
        ch = src[pos]
        if ch == "/" and pos + 1 < len(src):
            if src[pos + 1] == "/":
                pos = skip_line_comment(src, pos + 2)
                continue
            if src[pos + 1] == "*":
                pos = skip_block_comment(src, pos + 2)
                continue
        if ch in ('"', "'"):
            pos = skip_string(src, pos + 1, ch)
            continue
        if ch == "`":
            pos = skip_template_literal(src, pos + 1)
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
        pos += 1
    return pos


# ---------------------------------------------------------------------------
# Step 1 – identify sync exported functions in commands_helpers.ts
# ---------------------------------------------------------------------------

_SYNC_EXPORT_RE = re.compile(r"\bexport\s+function\s+(\w+)\s*[(<]")


def find_sync_function_names(src: str) -> list[str]:
    """Return names of all non-async exported functions."""
    return [m.group(1) for m in _SYNC_EXPORT_RE.finditer(src)]


# ---------------------------------------------------------------------------
# Step 2 – make those functions async in commands_helpers.ts
# ---------------------------------------------------------------------------

def make_exports_async(src: str) -> str:
    """Replace `export function` with `export async function`."""
    return re.sub(r"\bexport function\b", "export async function", src)


# ---------------------------------------------------------------------------
# Step 3 – add `await` before un-awaited calls in a source file
# ---------------------------------------------------------------------------

def _build_call_pattern(func_names: list[str]) -> re.Pattern:
    # Sort longest first so longer names are tried before shorter prefixes
    names = sorted(func_names, key=len, reverse=True)
    alternation = "|".join(re.escape(n) for n in names)
    # The function name must NOT be preceded by `.` or another word character
    # (to avoid matching `obj.setCellContent(` or `_setCellContent(`)
    return re.compile(r"(?<![.\w])(?:" + alternation + r")(?=\s*\()")


def _is_already_awaited(src: str, call_start: int) -> bool:
    """Return True if `await` (optionally with whitespace) precedes call_start."""
    before = src[:call_start]
    # Strip trailing spaces/tabs (not newlines – await must be on same expression)
    i = len(before) - 1
    while i >= 0 and before[i] in " \t":
        i -= 1
    return before[i - 4 : i + 1] == "await"


def _is_in_import(src: str, call_start: int) -> bool:
    """Return True if the match is inside an import statement."""
    line_start = src.rfind("\n", 0, call_start) + 1
    line = src[line_start:call_start]
    return bool(re.match(r"\s*import\b", line) or "from " in line)


def _is_declaration(src: str, call_start: int) -> bool:
    """Return True if the match is the name in a function declaration (not a call)."""
    before = src[:call_start]
    return bool(re.search(r"\bfunction\s+$", before))


def find_await_insertions(src: str, func_names: list[str]) -> list[int]:
    """
    Return sorted list of character positions in *src* where `await ` should
    be inserted (i.e. just before the function name of an un-awaited call).
    """
    if not func_names:
        return []

    pattern = _build_call_pattern(func_names)
    insertions: list[int] = []
    pos = 0

    while pos < len(src):
        ch = src[pos]

        # Skip comments and strings (they cannot contain real calls)
        if ch == "/" and pos + 1 < len(src):
            if src[pos + 1] == "/":
                pos = skip_line_comment(src, pos + 2)
                continue
            if src[pos + 1] == "*":
                pos = skip_block_comment(src, pos + 2)
                continue
        if ch in ('"', "'"):
            pos = skip_string(src, pos + 1, ch)
            continue
        if ch == "`":
            pos = skip_template_literal(src, pos + 1)
            continue

        m = pattern.match(src, pos)
        if m:
            call_start = m.start()
            if (
            not _is_already_awaited(src, call_start)
            and not _is_in_import(src, call_start)
            and not _is_declaration(src, call_start)
        ):
                insertions.append(call_start)
            pos = m.end()
            continue

        pos += 1

    return sorted(set(insertions))


def apply_insertions(src: str, insertions: list[int], text: str = "await ") -> str:
    if not insertions:
        return src
    parts = []
    prev = 0
    for pos in insertions:
        parts.append(src[prev:pos])
        parts.append(text)
        prev = pos
    parts.append(src[prev:])
    return "".join(parts)


# ---------------------------------------------------------------------------
# File discovery
# ---------------------------------------------------------------------------

def find_test_files(root: Path) -> list[Path]:
    """Return all *.ts files under <root>/tests (recursively)."""
    tests_dir = root / "tests"
    if not tests_dir.is_dir():
        return []
    return list(tests_dir.rglob("*.ts"))


def imports_helpers(src: str, func_names: list[str]) -> bool:
    """Return True if the file imports any of the helper functions.

    Matches imports from:
      - commands_helpers  (direct)
      - test_helpers/index  (re-exports everything from commands_helpers)
      - test_helpers  (same index, shorter path)
    """
    # Check if the file has an import from a test_helpers path
    if not re.search(r"""from\s+['"][^'"]*test_helpers[^'"]*['"]""", src):
        return False
    # Check that at least one function name actually appears in the file
    for name in func_names:
        if re.search(r"\b" + re.escape(name) + r"\s*\(", src):
            return True
    return False


# ---------------------------------------------------------------------------
# Process a single file
# ---------------------------------------------------------------------------

def process_file(
    path: Path,
    func_names: list[str],
    *,
    is_helpers_file: bool = False,
    dry_run: bool = False,
    inplace: bool = False,
) -> bool:
    """
    Transform *path*.  Returns True if the file was (or would be) changed.
    """
    src = path.read_text(encoding="utf-8")
    original = src

    if is_helpers_file:
        src = make_exports_async(src)

    # Add await to calls (in the helpers file itself and in test files)
    insertions = find_await_insertions(src, func_names)
    src = apply_insertions(src, insertions)

    if src == original:
        return False

    if dry_run:
        diff = difflib.unified_diff(
            original.splitlines(keepends=True),
            src.splitlines(keepends=True),
            fromfile=f"a/{path}",
            tofile=f"b/{path}",
        )
        sys.stdout.writelines(diff)
    elif inplace:
        path.write_text(src, encoding="utf-8")
    else:
        sys.stdout.write(src)

    return True


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Make sync helpers in commands_helpers.ts async and add `await` "
            "before their calls in test files."
        )
    )
    parser.add_argument(
        "--root",
        default=".",
        help="Repository root (default: current directory)",
    )
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument(
        "--inplace", "-i",
        action="store_true",
        help="Modify files in place",
    )
    mode.add_argument(
        "--dry-run", "-d",
        action="store_true",
        help="Show unified diffs, do not write files",
    )
    args = parser.parse_args()

    root = Path(args.root).resolve()
    helpers_path = root / "tests" / "test_helpers" / "commands_helpers.ts"

    if not helpers_path.exists():
        print(f"ERROR: {helpers_path} not found", file=sys.stderr)
        sys.exit(1)

    helpers_src = helpers_path.read_text(encoding="utf-8")

    # Collect the names of currently-sync exported functions
    func_names = find_sync_function_names(helpers_src)
    if not func_names:
        print("No sync exported functions found in commands_helpers.ts – nothing to do.",
              file=sys.stderr)
        sys.exit(0)

    print(f"Found {len(func_names)} sync helper(s) to convert:", file=sys.stderr)
    for name in sorted(func_names):
        print(f"  {name}", file=sys.stderr)

    changed_files: list[Path] = []

    # 1. Transform commands_helpers.ts itself
    if process_file(
        helpers_path,
        func_names,
        is_helpers_file=True,
        dry_run=args.dry_run,
        inplace=args.inplace,
    ):
        changed_files.append(helpers_path)

    # 2. Transform every test file that imports from commands_helpers
    for ts_file in sorted(find_test_files(root)):
        if ts_file == helpers_path:
            continue
        try:
            src = ts_file.read_text(encoding="utf-8")
        except OSError:
            continue
        if not imports_helpers(src, func_names):
            continue
        if process_file(
            ts_file,
            func_names,
            is_helpers_file=False,
            dry_run=args.dry_run,
            inplace=args.inplace,
        ):
            changed_files.append(ts_file)

    # Summary
    verb = "Would change" if args.dry_run else ("Changed" if args.inplace else "Would change (stdout)")
    print(f"\n{verb} {len(changed_files)} file(s):", file=sys.stderr)
    for p in changed_files:
        print(f"  {p.relative_to(root)}", file=sys.stderr)


if __name__ == "__main__":
    main()
