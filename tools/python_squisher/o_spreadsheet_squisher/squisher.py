"""Port of src/plugins/core/squisher.ts (and of the sheet part of unsquisher.ts, used to verify the
result, the same way `Model.exportData` does).

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
"""

import re
from collections.abc import Iterable
from dataclasses import dataclass, replace

from ._js import js_number_to_string
from .formula import CompiledFormula, Compiler
from .ranges import Range, Sheets, Zone, UnboundedZone, get_range_from_sheet_xc, get_range_string
from .ranges import to_cartesian, to_xc, to_zone

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
    compiled: CompiledFormula | None = None

    @property
    def is_formula(self) -> bool:
        return self.compiled is not None


class Squisher:
    def __init__(self, sheets: Sheets, compiler: Compiler, non_squishable_functions: Iterable[str] = ()):
        self.sheets = sheets
        self.compiler = compiler
        self.non_squishable_functions = list(non_squishable_functions)
        self.base_formula: CompiledFormula | None = None
        self.already_applied_number_offsets: list[float] = []
        self.previous_decoded_numbers: list[float] = []
        self.previous_strings: list[str] = []
        self.base_formula_was_transformed = False
        self.base_number: float | None = None
        self.base_number_format = None

    # ------------------------------------------------------------------
    # state
    # ------------------------------------------------------------------

    def reset_base_to(self, formula: CompiledFormula):
        self.base_formula = formula.with_values(
            formula.range_dependencies, formula.numbers, formula.strings
        )
        self.already_applied_number_offsets = [0.0 for _ in formula.numbers]
        # the numbers as the unsquisher reads them
        self.previous_decoded_numbers = list(formula.numbers)
        self.previous_strings = list(formula.strings)
        self.base_formula_was_transformed = False
        self.base_number = None

    def reset_base_formula(self):
        if self.base_formula:
            self.base_formula = None
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

    def make_cell(self, content: str, format, sheet_id: str) -> Cell:
        if content.startswith("="):
            return Cell(content, format, self.compiler.compile(content, sheet_id))
        return Cell(content, format)

    def _formula_string(self, formula: CompiledFormula) -> str:
        return formula.to_formula_string(self.sheets, do_not_simplify_range=True)

    def squish(self, cell: Cell, for_sheet_id: str) -> SquishedContent:
        """Squish a cell against the previous one (in the previous call).

        Call it for each cell of a sheet, column by column (left to right), top to bottom.
        """
        if cell.is_formula:
            formula = cell.compiled
            if any(formula.uses_symbol(name) for name in self.non_squishable_functions):
                self.reset_base_formula()
                # Not in the TS version: without it, a number following a non squishable formula
                # can be squished as an offset of the number preceding that formula, which the
                # unsquisher cannot read back (it rebases on any formula).
                self.reset_base_number()
                return self._formula_string(formula)
            if not self.base_formula or self.base_formula.normalized_formula != formula.normalized_formula:
                self.reset_base_to(formula)
                return self._formula_string(formula)
            if (
                not self.base_formula_was_transformed
                and formula.numbers == self.base_formula.numbers
                and formula.strings == self.base_formula.strings
                and formula.range_dependencies == self.base_formula.range_dependencies
            ):
                return self._formula_string(formula)
            if not self._can_squish_literals(formula):
                # Not in the TS version: the offsets would not be read back to the same values
                self.reset_base_to(formula)
                return self._formula_string(formula)
            numbers = self._squish_numbers(formula.numbers)
            strings = self._squish_strings(formula.strings)
            references = self._squish_references(formula.range_dependencies, for_sheet_id)
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

    def squish_sheet(self, cells: dict[str, SquishedContent], original_contents: dict[str, str]) -> dict:
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
            if isinstance(value, dict) and "N" in value and not original_contents[key].startswith("="):
                # an isolated number offset is not worth it: write the number itself
                value = original_contents[key]
            result[key] = value
            start += 1
        return result

    # ------------------------------------------------------------------
    # literals & references
    # ------------------------------------------------------------------

    @staticmethod
    def _build_result(numbers: list[str], strings: list[str], references: list[str]) -> dict:
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

    def _can_squish_literals(self, formula: CompiledFormula) -> bool:
        """Check that the unsquisher reads the offsets back to the exact same literals.

        Not in the TS version, which has two flaws (caught by the export verification there, that
        then exports the whole workbook unsquished):
        - numbers: the squisher computes `current - (base + offset)` while the unsquisher computes
          `previous + diff`, which differ with floats (0.1 + 0.2...)
        - strings: a string changed to "=" is read as NO_CHANGE
        """
        for i, current in enumerate(formula.numbers):
            base = self.base_formula.numbers[i]
            diff = current - (base + (self.already_applied_number_offsets[i] or 0.0))
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

    def _squish_references(self, references: list[Range], for_sheet_id: str) -> list[str]:
        previous_references = self.base_formula.range_dependencies
        return [
            self._squish_one_reference(reference, previous_references, i, for_sheet_id)
            for i, reference in enumerate(references)
        ]

    def _full_reference(self, reference: Range, previous_references: list[Range], index: int, for_sheet_id: str):
        previous_references[index] = reference.copy()
        return get_range_string(reference, for_sheet_id, self.sheets, do_not_simplify_range=True)

    def _squish_one_reference(
        self, reference: Range, previous_references: list[Range], index: int, for_sheet_id: str
    ) -> str:
        previous = previous_references[index]
        if previous == reference:
            return NO_CHANGE
        if (
            previous.sheet_id != reference.sheet_id
            or previous.prefix_sheet != reference.prefix_sheet
            or previous.invalid_sheet_name != reference.invalid_sheet_name
            or previous.invalid_xc != reference.invalid_xc
            or len(previous.parts) != len(reference.parts)
        ):
            # sheet changed or valid/invalid changed, cannot squish
            return self._full_reference(reference, previous_references, index, for_sheet_id)
        if (
            previous.unbounded_zone.bottom is None
            or previous.unbounded_zone.right is None
            or reference.unbounded_zone.bottom is None
            or reference.unbounded_zone.right is None
        ):
            # unbounded ranges, cannot squish
            return self._full_reference(reference, previous_references, index, for_sheet_id)
        if previous.parts != reference.parts:
            # absolute/relative parts changed, cannot squish
            return self._full_reference(reference, previous_references, index, for_sheet_id)
        current_zone, previous_zone = reference.zone, previous.zone
        if (
            current_zone.top != current_zone.bottom
            or current_zone.left != current_zone.right
            or previous_zone.top != previous_zone.bottom
            or previous_zone.left != previous_zone.right
        ):
            # ranges, cannot squish
            return self._full_reference(reference, previous_references, index, for_sheet_id)

        diff_col = current_zone.left - previous_zone.left
        diff_row = current_zone.top - previous_zone.top
        previous.zone = reference.zone
        previous.unbounded_zone = reference.unbounded_zone
        if diff_col != 0 and diff_row == 0:
            return f"{'+' if diff_col > 0 else '-'}C{abs(diff_col)}"
        if diff_row != 0 and diff_col == 0:
            return f"{'+' if diff_row > 0 else '-'}R{abs(diff_row)}"
        return get_range_string(reference, for_sheet_id, self.sheets, do_not_simplify_range=True)


# ---------------------------------------------------------------------------
# Unsquisher (sheet cells only), used to verify the squished result
# ---------------------------------------------------------------------------


class SquishError(Exception):
    pass


class Unsquisher:
    def __init__(self, sheets: Sheets, compiler: Compiler):
        self.sheets = sheets
        self.compiler = compiler
        self.rebase()

    def rebase(self):
        self.previous_formula: CompiledFormula | None = None
        self.already_applied_number_offset: list[float] = []
        self.previous_string: list[str] = []
        self.already_applied_reference_offset: list[Range] = []
        self.previous_offset: dict | None = None
        self.previous_number: float | None = None

    def unsquish_sheet(self, squished: dict, sheet_id: str) -> dict[str, str]:
        """Return {xc: content} as `_exportData(false)` would export it after importing `squished`."""
        keys = sorted(squished, key=lambda key: to_cartesian(key.split(":")[0]))
        strategy = None
        result: dict[str, str] = {}
        for key in keys:
            current = squished[key]
            if current is None or current == "":
                self.rebase()
                strategy = None
                continue
            strategy = self._choose_strategy(current, strategy, sheet_id)
            zone = to_zone(key)
            positions = [
                to_xc(col, row)
                for col in range(zone.left, zone.right + 1)
                for row in range(zone.top, zone.bottom + 1)
            ]
            for xc, content in zip(positions, self._apply_strategy(strategy, len(positions), current, sheet_id)):
                result[xc] = content
        return result

    def _choose_strategy(self, current, previous_strategy, sheet_id):
        strategy = previous_strategy
        if isinstance(current, str):
            if current.startswith("="):
                try:
                    compiled = self.compiler.compile(current, sheet_id)
                except ValueError:
                    self.rebase()
                    return "NOT_A_FORMULA"
                self.previous_formula = compiled
                self.already_applied_number_offset = list(compiled.numbers)
                self.previous_string = list(compiled.strings)
                self.already_applied_reference_offset = list(compiled.range_dependencies)
                self.previous_offset = None
                self.previous_number = None
                return "NEW_FORMULA"
            number = parse_squishable_integer(current)
            self.rebase()
            if number is not None:
                self.previous_number = number
                return "NEW_NUMBER"
            return "NOT_A_FORMULA"
        # JS truthiness: arrays are always truthy, strings when not empty
        if current.get("N") or current.get("S") is not None or current.get("R"):
            if strategy == "NEW_FORMULA":
                return "FIRST_OFFSET"
            if strategy == "NEW_NUMBER":
                if current.get("R") or current.get("S"):
                    raise SquishError("cannot have string or reference offsets for a number")
                return "OFFSET_NUMBER"
            if strategy == "FIRST_OFFSET":
                return "COMBINE_OFFSET"
            if strategy in ("COMBINE_OFFSET", "OFFSET_NUMBER"):
                return strategy
            raise SquishError(f"Cannot unsquish an offset without a preceding base cell: {strategy}")
        return strategy

    def _apply_strategy(self, strategy, count: int, current, sheet_id: str):
        if strategy == "NEW_FORMULA":
            rendered = self.previous_formula.to_formula_string(self.sheets)
            return [rendered] * count
        if strategy in ("NOT_A_FORMULA", "NEW_NUMBER"):
            return [current] * count
        if strategy == "FIRST_OFFSET":
            self.previous_offset = dict(current)
            return [self._unsquish_formula(self.previous_offset, sheet_id) for _ in range(count)]
        if strategy == "COMBINE_OFFSET":
            if self.previous_offset is None:
                raise SquishError("No previous offset to combine with")
            for key in ("N", "S", "R"):
                if current.get(key) is not None:
                    self.previous_offset[key] = current[key]
            return [self._unsquish_formula(self.previous_offset, sheet_id) for _ in range(count)]
        if strategy == "OFFSET_NUMBER":
            offset = current.get("N")
            if offset is None or self.previous_number is None:
                raise SquishError("No offset/previous number")
            result = []
            for _ in range(count):
                self.previous_number += float(offset)
                result.append(js_number_to_string(self.previous_number))
            return result
        raise SquishError(f"Unknown strategy {strategy}")

    def _unsquish_formula(self, squished: dict, sheet_id: str) -> str:
        base = self.previous_formula
        if base is None:
            raise SquishError("No previous cell to unsquish against")
        if squished.get("N"):
            numbers = [self._adjust_number(n, i) for i, n in enumerate(squished["N"].split(SEPARATOR))]
        else:
            numbers = base.numbers
        if squished.get("S"):
            strings = [self._adjust_string(s, i) for i, s in enumerate(squished["S"])]
        else:
            strings = base.strings
        if squished.get("R") is not None:
            refs = squished["R"]
            refs = refs.split(SEPARATOR) if isinstance(refs, str) else refs
            dependencies = [self._adjust_reference(r, i, sheet_id) for i, r in enumerate(refs)]
        else:
            dependencies = base.range_dependencies
        return base.with_values(dependencies, numbers, strings).to_formula_string(self.sheets)

    def _adjust_reference(self, ref: str, index: int, sheet_id: str) -> Range:
        offsets = self.already_applied_reference_offset
        if ref == NO_CHANGE:
            return offsets[index].copy()
        if ref[0] in "+-":
            offset = int(ref[2:]) * (1 if ref[0] == "+" else -1)
            previous = offsets[index]
            z = previous.zone
            if ref[1] == "R":
                zone = Zone(z.left, z.top + offset, z.right, z.top + offset)
            elif ref[1] == "C":
                zone = Zone(z.left + offset, z.top, z.left + offset, z.bottom)
            else:
                raise SquishError(f"Invalid reference offset format: {ref}")
            updated = replace(previous, zone=zone, unbounded_zone=UnboundedZone(*zone))
            offsets[index] = updated
            return updated
        full = get_range_from_sheet_xc(self.sheets, sheet_id, ref)
        offsets[index] = full
        return full

    def _adjust_string(self, value: str, index: int) -> str:
        if value == NO_CHANGE:
            return self.previous_string[index]
        self.previous_string[index] = value
        return value

    def _adjust_number(self, value: str, index: int) -> float:
        if value == NO_CHANGE:
            return self.already_applied_number_offset[index]
        adjusted = (self.already_applied_number_offset[index] or 0.0) + float(value[1:])
        self.already_applied_number_offset[index] = adjusted
        return adjusted
