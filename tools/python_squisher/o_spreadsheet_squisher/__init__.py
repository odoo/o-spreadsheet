"""Python port of the o-spreadsheet export squisher (src/plugins/core/squisher.ts).

Typical use: compress the cells of a (non squished) workbook JSON on the server side, producing the
same `sheets[i].cells` that `model.exportData()` would produce in the browser.

    from o_spreadsheet_squisher import squish_workbook_data, FunctionRegistry

    functions = FunctionRegistry.builtin()
    functions.add("ODOO.PIVOT", [(False, False), (False, False), (True, True)])
    squished = squish_workbook_data(data, functions=functions)
"""

import copy
from collections.abc import Iterable

from .formula import ArgSpec, CompiledFormula, Compiler, FunctionRegistry, FunctionSpec
from .ranges import SheetInfo, Sheets, to_cartesian, to_zone
from .squisher import (
    NO_CHANGE,
    SEPARATOR,
    Cell,
    SquishedContent,
    SquishError,
    Squisher,
    Unsquisher,
)

__all__ = [
    "NO_CHANGE",
    "SEPARATOR",
    "ArgSpec",
    "Cell",
    "CompiledFormula",
    "Compiler",
    "FunctionRegistry",
    "FunctionSpec",
    "SheetInfo",
    "Sheets",
    "SquishError",
    "SquishedContent",
    "Squisher",
    "Unsquisher",
    "squish_sheet_cells",
    "squish_workbook_data",
]


def _cell_formats(sheet: dict, cells: Iterable[str]) -> dict[str, object]:
    """Resolve `sheet["formats"]` ({zone: formatId}) for the given cells."""
    by_col: dict[int, list[tuple[int, int, object]]] = {}
    for zone_xc, format_id in (sheet.get("formats") or {}).items():
        zone = to_zone(zone_xc)
        for col in range(zone.left, zone.right + 1):
            by_col.setdefault(col, []).append((zone.top, zone.bottom, format_id))
    result = {}
    for xc in cells:
        col, row = to_cartesian(xc)
        for top, bottom, format_id in by_col.get(col, ()):
            if top <= row <= bottom:
                result[xc] = format_id
    return result


def _check_not_squished(cells: dict):
    for key, value in cells.items():
        if ":" in key or isinstance(value, dict):
            raise ValueError(f"The cells are already squished ({key!r}: {value!r})")


def squish_sheet_cells(
    cells: dict[str, str],
    sheet_id: str,
    sheets: Sheets,
    compiler: Compiler,
    formats: dict[str, object] | None = None,
    non_squishable_functions: Iterable[str] = (),
) -> dict[str, SquishedContent]:
    """Squish the {xc: content} cells of one sheet. `formats` maps xc -> format (id)."""
    _check_not_squished(cells)
    formats = formats or {}
    squisher = Squisher(sheets, compiler, non_squishable_functions)
    positions = sorted(
        (to_cartesian(xc), xc)
        for xc, content in cells.items()
        if content not in (None, "")
    )
    squished: dict[str, SquishedContent] = {}
    for _, xc in positions:
        content = cells[xc]
        if not isinstance(content, str):
            raise TypeError(f"Cell {xc}: content must be a string, got {content!r}")
        try:
            cell = squisher.make_cell(content, formats.get(xc), sheet_id)
        except ValueError:
            # out-of-bound reference: o-spreadsheet cannot load it either, leave it untouched
            squisher.reset_base_formula()
            squisher.reset_base_number()
            squished[xc] = content
            continue
        squished[xc] = squisher.squish(cell, sheet_id)
    return squisher.squish_sheet(squished, {xc: cells[xc] for _, xc in positions})


def expected_unsquished_cells(
    cells: dict[str, str], sheet_id: str, sheets: Sheets, compiler: Compiler
) -> dict[str, str]:
    """The cells as o-spreadsheet would export them (unsquished) after loading them."""
    result = {}
    for xc, content in cells.items():
        if content in (None, ""):
            continue
        if content.startswith("="):
            try:
                content = compiler.compile(content, sheet_id).to_formula_string(sheets)
            except ValueError:
                pass
        result[xc] = content
    return result


def squish_workbook_data(
    data: dict,
    functions: FunctionRegistry | None = None,
    non_squishable_functions: Iterable[str] = (),
    verify: bool = True,
) -> dict:
    """Return a copy of the workbook `data` with squished cells.

    `functions` must contain every function the formulas may use (defaults to the o-spreadsheet
    built-ins). `non_squishable_functions` mirrors `NonSquishableFunctionRegistry`.

    With `verify` (the default, like `Model.exportData`), the result is unsquished again and compared
    to the original; on any difference the cells are left unsquished and `isNotSquishable` is set.
    """
    data = copy.deepcopy(data)
    if data.get("isNotSquishable"):
        return data
    functions = functions or FunctionRegistry.builtin()
    non_squishable_functions = list(non_squishable_functions)
    sheets = Sheets.from_workbook_data(data)
    compiler = Compiler(sheets, functions)
    squished_sheets = []
    for sheet in data.get("sheets", []):
        cells = sheet.get("cells") or {}
        formats = _cell_formats(sheet, cells)
        squished = squish_sheet_cells(
            cells, sheet["id"], sheets, compiler, formats, non_squishable_functions
        )
        squished_sheets.append(squished)
        if verify:
            try:
                unsquished = Unsquisher(sheets, compiler).unsquish_sheet(
                    squished, sheet["id"]
                )
            except (SquishError, ValueError, IndexError):
                unsquished = None
            if unsquished != expected_unsquished_cells(
                cells, sheet["id"], sheets, compiler
            ):
                data["isNotSquishable"] = True
                return data
    for sheet, squished in zip(data.get("sheets", []), squished_sheets):
        sheet["cells"] = squished
    return data
