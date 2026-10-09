"""Python port of the o-spreadsheet export squisher (src/plugins/core/squisher.ts).

Typical use: compress the cells of a (non squished) workbook JSON on the server side, so that
o-spreadsheet loads it back to the same cells.

    from o_spreadsheet_squisher import squish_workbook_data

    squished = squish_workbook_data(data, non_squishable_functions=["ODOO.PIVOT"])

The formulas are assumed to be valid for o-spreadsheet (no unknown function, no syntax error...),
see formula.py. Nothing is verified.
"""

import copy
from collections.abc import Iterable

from .references import to_cartesian, to_zone
from .squisher import NO_CHANGE, SEPARATOR, Cell, SquishedContent, Squisher

__all__ = [
    "NO_CHANGE",
    "SEPARATOR",
    "Cell",
    "SquishedContent",
    "Squisher",
    "squish_sheet_cells",
    "squish_workbook_data",
]


def _cell_formats(sheet: dict, cells: Iterable[str]) -> dict[str, object]:
    """Resolve `sheet["formats"]` ({zone: formatId}) for the given cells."""
    by_col: dict[int, list[tuple[int, int, object]]] = {}
    for zone_xc, format_id in (sheet.get("formats") or {}).items():
        left, top, right, bottom = to_zone(zone_xc)
        for col in range(left, right + 1):
            by_col.setdefault(col, []).append((top, bottom, format_id))
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
    formats: dict[str, object] | None = None,
    non_squishable_functions: Iterable[str] = (),
) -> dict[str, SquishedContent]:
    """Squish the {xc: content} cells of one sheet. `formats` maps xc -> format (id)."""
    _check_not_squished(cells)
    formats = formats or {}
    squisher = Squisher(non_squishable_functions)
    positions = sorted(
        (to_cartesian(xc), xc) for xc, content in cells.items() if content not in (None, "")
    )
    squished: dict[str, SquishedContent] = {}
    for _, xc in positions:
        content = cells[xc]
        if not isinstance(content, str):
            raise TypeError(f"Cell {xc}: content must be a string, got {content!r}")
        squished[xc] = squisher.squish(Cell.from_content(content, formats.get(xc)))
    return squisher.squish_sheet(squished, {xc: cells[xc] for _, xc in positions})


def squish_workbook_data(data: dict, non_squishable_functions: Iterable[str] = ()) -> dict:
    """Return a copy of the workbook `data` with squished cells.

    `non_squishable_functions` mirrors `NonSquishableFunctionRegistry`.
    """
    data = copy.deepcopy(data)
    if data.get("isNotSquishable"):
        return data
    non_squishable_functions = list(non_squishable_functions)
    for sheet in data.get("sheets", []):
        cells = sheet.get("cells") or {}
        _check_not_squished(cells)
        sheet["cells"] = squish_sheet_cells(
            cells, _cell_formats(sheet, cells), non_squishable_functions
        )
    return data
