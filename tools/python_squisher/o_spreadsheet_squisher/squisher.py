"""Port of src/plugins/core/squisher.ts

Example of squishing:
  "=concat(A1, "test", B1:C3, 5)" followed by
  "=concat(A2, "test", B1:C3, 7)"
         __|      |_     |    |
        |    _______|____|    |
        v   v       v         v
  {R: "+R1|=", S: ["="], N: "+2"}

N can be full numbers or relative change identified with a + sign before the number.
R can be full references or relative change identified with a +Ck or +Rk (k being the number of
columns or rows of the change).
S can only be the full string if it changed, or "=" if it did not change.

Formulas and references written in full are written as in the input.
"""

import re
from collections.abc import Iterable
from dataclasses import dataclass

from ._js import js_number_to_string
from .formula import Formula
from .references import Reference, to_cartesian, to_xc

SEPARATOR = "|"
NO_CHANGE = "="

SquishedContent = str | dict

_INTEGER_CONTENT = re.compile(r"-?(0|[1-9][0-9]*)\Z")


def parse_squishable_integer(content: str) -> float | None:
    """Return the value of a literal cell that o-spreadsheet squishes as a number.

    o-spreadsheet squishes every literal whose parsed value is an integer (including dates, "$5",
    "1e3", ...). We only accept canonical integers (what `toString(parsedValue)` gives, i.e. how
    numbers are stored in the exported data): anything else simply breaks the number chain, which
    is always safe.
    """
    if not _INTEGER_CONTENT.match(content):
        return None
    value = float(content)
    if js_number_to_string(value) != content:
        return None
    return value


@dataclass
class Cell:
    content: str
    format: object = None  # anything comparable with ==, e.g. a format id
    formula: Formula | None = None

    @classmethod
    def from_content(cls, content: str, format=None) -> "Cell":
        formula = Formula.from_text(content) if content.startswith("=") else None
        return cls(content, format, formula)


class Squisher:
    def __init__(self, non_squishable_functions: Iterable[str] = ()):
        self.non_squishable_functions = list(non_squishable_functions)
        self.base_formula: Formula | None = None
        # references of the base formula, updated with each offset
        self.previous_references: list[Reference] = []
        self.already_applied_number_offsets: list[float] = []
        self.previous_decoded_numbers: list[float] = []
        self.previous_strings: list[str] = []
        self.base_formula_was_transformed = False
        self.base_number: float | None = None
        self.base_number_format = None

    # ------------------------------------------------------------------
    # state
    # ------------------------------------------------------------------

    def reset_base_to(self, formula: Formula):
        self.base_formula = formula
        self.previous_references = list(formula.references)
        self.already_applied_number_offsets = [0.0 for _ in formula.numbers]
        # the numbers as the unsquisher reads them
        self.previous_decoded_numbers = list(formula.numbers)
        self.previous_strings = list(formula.strings)
        self.base_formula_was_transformed = False
        self.base_number = None

    def reset_base_formula(self):
        if self.base_formula:
            self.base_formula = None
            self.previous_references = []
            self.already_applied_number_offsets = []
            self.previous_decoded_numbers = []
            self.previous_strings = []
            self.base_formula_was_transformed = False

    def reset_base_number(self):
        self.base_number = None
        self.base_number_format = None

    # ------------------------------------------------------------------
    # cells
    # ------------------------------------------------------------------

    def squish(self, cell: Cell) -> SquishedContent:
        """Squish a cell against the previous one (in the previous call).

        Call it for each cell of a sheet, column by column (left to right), top to bottom.
        """
        if cell.formula:
            formula = cell.formula
            if not formula.is_squishable or any(
                formula.uses_symbol(name) for name in self.non_squishable_functions
            ):
                self.reset_base_formula()
                # Not in the TS version: without it, a number following a non squishable formula
                # can be squished as an offset of the number preceding that formula, which the
                # unsquisher cannot read back (it rebases on any formula).
                self.reset_base_number()
                return formula.text
            if (
                not self.base_formula
                or self.base_formula.normalized != formula.normalized
            ):
                self.reset_base_to(formula)
                return formula.text
            if (
                not self.base_formula_was_transformed
                and formula.numbers == self.base_formula.numbers
                and formula.strings == self.base_formula.strings
                and formula.references == self.base_formula.references
            ):
                return formula.text
            if not self._can_squish_literals(formula):
                # Not in the TS version: the offsets would not be read back to the same values
                self.reset_base_to(formula)
                return formula.text
            numbers = self._squish_numbers(formula.numbers)
            strings = self._squish_strings(formula.strings)
            references = [
                self._squish_one_reference(reference, i)
                for i, reference in enumerate(formula.references)
            ]
            self.base_formula_was_transformed = True
            return self._build_result(numbers, strings, references)

        number = parse_squishable_integer(cell.content)
        if number is not None:
            self.reset_base_formula()
            if self.base_number is None or cell.format != self.base_number_format:
                self.base_number = number
                self.base_number_format = cell.format
                return cell.content
            offset = number - self.base_number
            if offset == 0:
                return cell.content
            if self.base_number + float(js_number_to_string(offset)) != number:
                # Not in the TS version: the unsquisher would not get the same number back
                self.base_number = number
                self.base_number_format = cell.format
                return cell.content
            self.base_number = number
            return {"N": ("+" if offset > 0 else "") + js_number_to_string(offset)}

        self.reset_base_formula()
        self.reset_base_number()
        return cell.content

    def squish_sheet(
        self, cells: dict[str, SquishedContent], original_contents: dict[str, str]
    ) -> dict:
        """Merge consecutive cells (same column) with the same content or transformation into one zone."""
        keys = list(cells)
        positions = [to_cartesian(key) for key in keys]
        result: dict[str, SquishedContent] = {}
        start = 0
        while start < len(keys):
            col, row = positions[start]
            merged = 0
            while start + merged + 1 < len(keys):
                next_col, next_row = positions[start + merged + 1]
                if (
                    next_col != col
                    or next_row != row + merged + 1
                    or cells[keys[start + merged + 1]] != cells[keys[start]]
                ):
                    break
                merged += 1
            key = keys[start]
            if merged > 0:
                result[f"{key}:{to_xc(col, row + merged)}"] = cells[key]
                start += merged + 1
                continue
            value = cells[key]
            if (
                isinstance(value, dict)
                and "N" in value
                and not original_contents[key].startswith("=")
            ):
                # an isolated number offset is not worth it: write the number itself
                value = original_contents[key]
            result[key] = value
            start += 1
        return result

    # ------------------------------------------------------------------
    # literals & references
    # ------------------------------------------------------------------

    @staticmethod
    def _build_result(
        numbers: list[str], strings: list[str], references: list[str]
    ) -> dict:
        result = {}
        if numbers:
            result["N"] = SEPARATOR.join(numbers)
        if strings:
            result["S"] = strings
        if references:
            if any(SEPARATOR in r for r in references):
                result["R"] = references
            else:
                result["R"] = SEPARATOR.join(references)
        return result

    def _can_squish_literals(self, formula: Formula) -> bool:
        """Check that the unsquisher reads the offsets back to the exact same literals.

        Not in the TS version, which has two flaws (caught by the export verification there, that
        then exports the whole workbook unsquished):
        - numbers: the squisher computes `current - (base + offset)` while the unsquisher computes
          `previous + diff`, which differ with floats (0.1 + 0.2...)
        - strings: a string changed to "=" is read as NO_CHANGE
        """
        for i, current in enumerate(formula.numbers):
            if self.base_formula:
                base = self.base_formula.numbers[i]
                diff = current - (
                    base + (self.already_applied_number_offsets[i] or 0.0)
                )
                # "=" (diff == 0) is read as the previous value, "+diff" as previous + diff
                decoded = self.previous_decoded_numbers[i]
                if diff != 0:
                    decoded += float(js_number_to_string(diff))
                if decoded != current:
                    return False
        for i, current in enumerate(formula.strings):
            if current != self.previous_strings[i] and current == NO_CHANGE:
                return False
        return True

    def _squish_numbers(self, numbers: list[float]) -> list[str]:
        result = [NO_CHANGE] * len(numbers)
        for i, current in enumerate(numbers):
            previous = self.base_formula.numbers[i]
            previous_offset = self.already_applied_number_offsets[i] or 0.0
            diff = current - (previous + previous_offset)
            if diff != 0:
                result[i] = "+" + js_number_to_string(diff)
                self.already_applied_number_offsets[i] = previous_offset + diff
            self.previous_decoded_numbers[i] = current
        return result

    def _squish_strings(self, strings: list[str]) -> list[str]:
        result = [NO_CHANGE] * len(strings)
        for i, current in enumerate(strings):
            if current != self.previous_strings[i]:
                result[i] = current
                self.previous_strings[i] = current
        return result

    def _squish_one_reference(self, reference: Reference, index: int) -> str:
        """`=` if unchanged, a 1D offset between single cells of the same sheet with the same
        `$`, the reference as written otherwise."""
        previous = self.previous_references[index]
        if previous == reference:
            return NO_CHANGE
        self.previous_references[index] = reference
        current_cell, previous_cell = reference.cell, previous.cell
        if (
            previous.sheet != reference.sheet
            or not current_cell
            or not previous_cell
            or current_cell.col_fixed != previous_cell.col_fixed
            or current_cell.row_fixed != previous_cell.row_fixed
        ):
            return reference.text
        diff_col = current_cell.col - previous_cell.col
        diff_row = current_cell.row - previous_cell.row
        if diff_col != 0 and diff_row == 0:
            return f"{'+' if diff_col > 0 else '-'}C{abs(diff_col)}"
        if diff_row != 0 and diff_col == 0:
            return f"{'+' if diff_row > 0 else '-'}R{abs(diff_row)}"
        return reference.text
