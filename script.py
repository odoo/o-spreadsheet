#!/usr/bin/env python3
"""
add_async_to_tests.py

Adds the `async` keyword to Jest test callbacks that use `await` in their body
but are missing the `async` declaration.

Supports: test, it, beforeEach, beforeAll, afterEach, afterAll
          (and their .each, .skip, .only, .failing variants)

Usage:
    python add_async_to_tests.py <file.ts>            # print to stdout
    python add_async_to_tests.py --inplace <file.ts>  # modify in place
    python add_async_to_tests.py --dry-run <file.ts>  # show diff only
"""

import argparse
import difflib
import re
import sys
from typing import Optional


# ---------------------------------------------------------------------------
# Low-level text navigation helpers
# ---------------------------------------------------------------------------

def skip_line_comment(src: str, pos: int) -> int:
    """Advance past a // comment (up to but not including the newline)."""
    while pos < len(src) and src[pos] != "\n":
        pos += 1
    return pos


def skip_block_comment(src: str, pos: int) -> int:
    """Advance past a /* ... */ comment. pos is right after '/*'."""
    while pos < len(src) - 1:
        if src[pos] == "*" and src[pos + 1] == "/":
            return pos + 2
        pos += 1
    return len(src)


def skip_string(src: str, pos: int, quote: str) -> int:
    """Advance past a quoted string. pos is right after the opening quote."""
    while pos < len(src):
        ch = src[pos]
        if ch == "\\":
            pos += 2  # skip escape sequence
            continue
        if ch == quote:
            return pos + 1
        pos += 1
    return len(src)


def skip_template_literal(src: str, pos: int) -> int:
    """Advance past a template literal `...`. pos is right after the opening backtick.
    Handles nested ${...} expressions recursively."""
    while pos < len(src):
        ch = src[pos]
        if ch == "\\":
            pos += 2
            continue
        if ch == "`":
            return pos + 1
        if ch == "$" and pos + 1 < len(src) and src[pos + 1] == "{":
            # Skip the ${...} expression
            pos = skip_balanced_braces(src, pos + 2)
            continue
        pos += 1
    return len(src)


def skip_balanced_braces(src: str, pos: int) -> int:
    """Advance past a balanced { } block. pos is right after the opening '{'.
    Returns the position after the closing '}'."""
    depth = 1
    while pos < len(src) and depth > 0:
        pos, depth = _advance_one_token(src, pos, depth, "{", "}")
    return pos


def _advance_one_token(src: str, pos: int, depth: int, open_ch: str, close_ch: str):
    """Advance one logical token, updating depth for open/close characters.
    Returns (new_pos, new_depth)."""
    ch = src[pos]
    if ch == "/" and pos + 1 < len(src):
        if src[pos + 1] == "/":
            pos = skip_line_comment(src, pos + 2)
            return pos, depth
        if src[pos + 1] == "*":
            pos = skip_block_comment(src, pos + 2)
            return pos, depth
    if ch in ('"', "'"):
        pos = skip_string(src, pos + 1, ch)
        return pos, depth
    if ch == "`":
        pos = skip_template_literal(src, pos + 1)
        return pos, depth
    if ch == open_ch:
        depth += 1
    elif ch == close_ch:
        depth -= 1
    return pos + 1, depth


# ---------------------------------------------------------------------------
# Extract the full body of a function starting at a '{'
# ---------------------------------------------------------------------------

def extract_brace_body(src: str, open_brace_pos: int) -> tuple[int, int]:
    """Given the position of an opening '{', return (start, end) where
    src[start:end] is the content inside the braces (excluding the braces).
    Returns the position after the closing '}'."""
    assert src[open_brace_pos] == "{"
    start = open_brace_pos + 1
    pos = start
    depth = 1
    while pos < len(src) and depth > 0:
        pos, depth = _advance_one_token(src, pos, depth, "{", "}")
    # pos is now right after the closing '}'
    return start, pos - 1, pos  # body_start, body_end, after_close


# ---------------------------------------------------------------------------
# Check whether a function body contains a top-level `await`
# (i.e. not inside a nested function/arrow)
# ---------------------------------------------------------------------------

_AWAIT_RE = re.compile(r"\bawait\b")
# Matches start of a `function` keyword (possibly async)
_FUNC_KW_RE = re.compile(r"\b(?:async\s+)?function\s*\*?\s*\w*\s*\(")
# Matches `=>` that introduces an arrow function body
_ARROW_RE = re.compile(r"=>\s*\{")


def _skip_paren_list(src: str, after_open: int) -> int:
    """Skip a parenthesised list starting right after the opening '(', handling
    nested parens AND nested braces (TypeScript type annotations like `args: {}`).
    Returns the position right after the matching ')'."""
    paren_depth = 1
    pos = after_open
    while pos < len(src) and paren_depth > 0:
        ch = src[pos]
        if ch in ('"', "'"):
            pos = skip_string(src, pos + 1, ch)
            continue
        if ch == "`":
            pos = skip_template_literal(src, pos + 1)
            continue
        if ch == "/" and pos + 1 < len(src):
            if src[pos + 1] == "/":
                pos = skip_line_comment(src, pos + 2)
                continue
            if src[pos + 1] == "*":
                pos = skip_block_comment(src, pos + 2)
                continue
        if ch == "(":
            paren_depth += 1
        elif ch == ")":
            paren_depth -= 1
        elif ch == "{":
            # nested brace (type annotation) — skip it entirely
            _, _, pos = extract_brace_body(src, pos)
            continue
        pos += 1
    return pos


def _find_function_body_brace(src: str, after_paren_open: int) -> Optional[int]:
    """Given the position right after the opening '(' of a function's parameter
    list, return the position of the function body's opening '{', or None.
    Correctly handles TypeScript type annotations inside parameters and
    return-type annotations between ')' and '{'."""
    # Skip the full parameter list
    pos = _skip_paren_list(src, after_paren_open)
    # Now skip optional return-type annotation (e.g. `: Promise<void>`)
    # until we reach '{' (function body) or a token that means no body.
    # We track angle-bracket depth for generics and brace depth for object types.
    angle_depth = 0
    brace_depth = 0
    while pos < len(src):
        ch = src[pos]
        if ch in ('"', "'"):
            pos = skip_string(src, pos + 1, ch)
            continue
        if ch == "`":
            pos = skip_template_literal(src, pos + 1)
            continue
        if ch == "/" and pos + 1 < len(src):
            if src[pos + 1] == "/":
                pos = skip_line_comment(src, pos + 2)
                continue
            if src[pos + 1] == "*":
                pos = skip_block_comment(src, pos + 2)
                continue
        if ch == "<":
            angle_depth += 1
        elif ch == ">":
            if angle_depth > 0:
                angle_depth -= 1
        elif ch == "{":
            if brace_depth == 0 and angle_depth == 0:
                return pos  # This is the function body
            brace_depth += 1
        elif ch == "}":
            brace_depth -= 1
        elif ch in (";", ",") and angle_depth == 0 and brace_depth == 0:
            return None  # declaration, no body
        pos += 1
    return None


def has_direct_await(src: str, body_start: int, body_end: int) -> bool:
    """Return True if `await` appears directly in the function body
    (not inside nested function scopes)."""
    pos = body_start
    while pos < body_end:
        ch = src[pos]
        # Skip comments and strings
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

        # `function` keyword introduces a new scope — skip its body
        if ch in ("f", "a"):
            m = _FUNC_KW_RE.match(src, pos)
            if m:
                brace_pos = _find_function_body_brace(src, m.end())
                if brace_pos is not None and brace_pos < body_end:
                    _, _, after = extract_brace_body(src, brace_pos)
                    pos = after
                    continue

        # `=>` introduces an arrow function body — skip it
        if ch == "=":
            m = _ARROW_RE.match(src, pos)
            if m:
                # the `{` is the last char of the match
                brace_pos = m.end() - 1
                if brace_pos < body_end:
                    _, _, after = extract_brace_body(src, brace_pos)
                    pos = after
                    continue

        # Check for `await` (at the current, non-nested scope level)
        if ch == "a":
            m = _AWAIT_RE.match(src, pos)
            if m:
                return True

        pos += 1
    return False


# ---------------------------------------------------------------------------
# Find all test callbacks that need `async` added
# ---------------------------------------------------------------------------

# Matches Jest lifecycle/test function names (with optional .each/.skip/.only etc.)
_TEST_FUNC_RE = re.compile(
    r"\b(test|it|beforeEach|beforeAll|afterEach|afterAll)"
    r"(\.(?:each|skip|only|failing|concurrent))?"
    r"\s*\("
)

# Matches a non-async callback start: `() => {` or `(args) => {` or `function(...) {`
# We look for the pattern right after a comma (or opening paren for lifecycle hooks)
_CALLBACK_ARROW_RE = re.compile(
    r"(async\s+)?(\([^)]*\))\s*=>\s*\{"
)
_CALLBACK_FUNC_RE = re.compile(
    r"(async\s+)?function\s*\*?\s*\w*\s*\([^)]*\)\s*\{"
)


def find_patches(src: str) -> list[tuple[int, int, str]]:
    """Return a list of (insert_pos, insert_pos, text) patches to apply.
    Each patch inserts 'async ' at insert_pos."""
    patches: list[tuple[int, int, str]] = []
    pos = 0

    while pos < len(src):
        ch = src[pos]
        # Skip comments and strings
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

        # Try to match a test function call
        m = _TEST_FUNC_RE.match(src, pos)
        if not m:
            pos += 1
            continue

        # We matched a test function — now scan the argument list
        paren_open = m.end() - 1  # position of '('
        pos = m.end()  # advance past the match

        # If this is a .each(table)(...) call, the first '(' is the table
        # argument list. Skip it to find the actual (name, fn) call.
        is_each = m.group(2) and "each" in m.group(2)
        if is_each:
            after_table = _skip_paren_list(src, paren_open + 1)
            while after_table < len(src) and src[after_table] in " \t\n":
                after_table += 1
            if after_table >= len(src) or src[after_table] != "(":
                continue  # unexpected format, skip
            paren_open = after_table
            pos = after_table + 1

        # Scan forward for the callback (last argument that is a function)
        # Strategy: scan until we find a `() => {` or `function() {` that is
        # a direct argument (depth 1 inside the call's parentheses)
        # We do this by advancing token-by-token at paren depth 1
        paren_depth = 1
        scan = pos

        while scan < len(src) and paren_depth > 0:
            sch = src[scan]

            # Skip strings/comments first
            if sch == "/" and scan + 1 < len(src):
                if src[scan + 1] == "/":
                    scan = skip_line_comment(src, scan + 2)
                    continue
                if src[scan + 1] == "*":
                    scan = skip_block_comment(src, scan + 2)
                    continue
            if sch in ('"', "'"):
                scan = skip_string(src, scan + 1, sch)
                continue
            if sch == "`":
                scan = skip_template_literal(src, scan + 1)
                continue

            # At depth 1, look for a callback pattern BEFORE handling parens
            if paren_depth == 1:
                # Try arrow function callback: `(args) => {`
                m_arrow = _CALLBACK_ARROW_RE.match(src, scan)
                if m_arrow:
                    is_async = bool(m_arrow.group(1))
                    # The `{` is at the end of the match
                    brace_pos = m_arrow.end() - 1
                    body_start, body_end, after = extract_brace_body(
                        src, brace_pos)
                    if not is_async and has_direct_await(src, body_start, body_end):
                        patches.append((scan, scan, "async "))
                    scan = after
                    continue

                # Try regular function callback: `function(...) {`
                m_func = _CALLBACK_FUNC_RE.match(src, scan)
                if m_func:
                    is_async = bool(m_func.group(1))
                    brace_pos = m_func.end() - 1
                    body_start, body_end, after = extract_brace_body(
                        src, brace_pos)
                    if not is_async and has_direct_await(src, body_start, body_end):
                        func_pos = src.index("function", scan)
                        patches.append((func_pos, func_pos, "async "))
                    scan = after
                    continue

            if sch == "(":
                paren_depth += 1
                scan += 1
                continue
            if sch == ")":
                paren_depth -= 1
                scan += 1
                continue
            if sch == "{":
                # Skip nested brace block (e.g. object literal in arguments)
                _, _, scan = extract_brace_body(src, scan)
                continue

            scan += 1

    return patches


# ---------------------------------------------------------------------------
# Apply patches and rebuild the source
# ---------------------------------------------------------------------------

def apply_patches(src: str, patches: list[tuple[int, int, str]]) -> str:
    """Apply insertion patches (sorted by position) to src."""
    if not patches:
        return src
    # Sort by position, deduplicate
    patches = sorted(set(patches), key=lambda p: p[0])
    result = []
    prev = 0
    for insert_pos, _, text in patches:
        result.append(src[prev:insert_pos])
        result.append(text)
        prev = insert_pos
    result.append(src[prev:])
    return "".join(result)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Add missing `async` to Jest test callbacks that use `await`."
    )
    parser.add_argument("file", help="TypeScript test file to process")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument(
        "--inplace", "-i",
        action="store_true",
        help="Modify the file in place (default: print to stdout)",
    )
    mode.add_argument(
        "--dry-run", "-d",
        action="store_true",
        help="Show a unified diff without modifying the file",
    )
    args = parser.parse_args()

    try:
        with open(args.file, "r", encoding="utf-8") as fh:
            original = fh.read()
    except OSError as exc:
        print(f"Error reading {args.file}: {exc}", file=sys.stderr)
        sys.exit(1)

    patches = find_patches(original)
    patched = apply_patches(original, patches)

    if original == patched:
        print("No changes needed.", file=sys.stderr)
        if args.dry_run:
            sys.exit(0)
        if not args.inplace:
            sys.stdout.write(original)
        sys.exit(0)

    n = len(patches)
    print(f"{n} callback{'s' if n != 1 else ''} updated.", file=sys.stderr)

    if args.dry_run:
        diff = difflib.unified_diff(
            original.splitlines(keepends=True),
            patched.splitlines(keepends=True),
            fromfile=f"a/{args.file}",
            tofile=f"b/{args.file}",
        )
        sys.stdout.writelines(diff)
        sys.exit(0)

    if args.inplace:
        with open(args.file, "w", encoding="utf-8") as fh:
            fh.write(patched)
    else:
        sys.stdout.write(patched)


if __name__ == "__main__":
    main()
