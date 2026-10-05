"""Cell coordinates and the minimal reference parsing the squisher needs.

Only single cells can be squished as an offset (+R1, -C2): they are parsed to col/row. Ranges,
full columns/rows and #REF are only compared by their text, and always written in full.
"""

import re
from dataclasses import dataclass, field

from ._js import unquote
from .tokenizer import INVALID_REFERENCE

_SINGLE_CELL = re.compile(r"(\$?)([A-Za-z]{1,3})(\$?)([0-9]{1,7})\Z")


def _letters_to_col(letters: str) -> int:
    col = 0
    for char in letters.upper():
        col = col * 26 + ord(char) - 64
    return col - 1


def number_to_letters(n: int) -> str:
    if n < 0:
        raise ValueError(f"number must be positive. Got {n}")
    if n < 26:
        return chr(65 + n)
    return number_to_letters(n // 26 - 1) + number_to_letters(n % 26)


def to_cartesian(xc: str) -> tuple[int, int]:
    """'B3' -> (col=1, row=2)"""
    match = _SINGLE_CELL.match(xc.strip(" "))
    if not match or match.group(1) or match.group(3):
        raise ValueError(f"Invalid cell description: {xc}")
    return _letters_to_col(match.group(2)), int(match.group(4)) - 1


def to_xc(col: int, row: int) -> str:
    return number_to_letters(col) + str(row + 1)


def to_zone(xc: str) -> tuple[int, int, int, int]:
    """'A1:B3' -> (left, top, right, bottom). Bounded zones only."""
    start, _, end = xc.partition(":")
    left, top = to_cartesian(start)
    right, bottom = to_cartesian(end) if end else (left, top)
    return min(left, right), min(top, bottom), max(left, right), max(top, bottom)


@dataclass(slots=True)
class SingleCell:
    col: int
    row: int
    col_fixed: bool
    row_fixed: bool


@dataclass(slots=True)
class Reference:
    """A reference token of a formula. Two equal references point to the same cells."""

    text: str = field(compare=False)  # as written in the formula
    sheet: str | None  # sheet name as written, None if not prefixed
    cell: SingleCell | None  # set for single cells only
    range_xc: str | None  # set for everything else (ranges, full columns/rows, #REF)

    @classmethod
    def from_token(cls, text: str) -> "Reference":
        if text == INVALID_REFERENCE:
            return cls(text, None, None, text)
        sheet, xc = None, text
        if "!" in text:
            parts = text.split("!")
            xc = parts.pop()
            sheet = unquote("!".join(parts), "'") or None
        match = _SINGLE_CELL.match(xc)
        if not match:
            return cls(text, sheet, None, xc)
        col_fixed, letters, row_fixed, digits = match.groups()
        cell = SingleCell(_letters_to_col(letters), int(digits) - 1, bool(col_fixed), bool(row_fixed))
        return cls(text, sheet, cell, None)
