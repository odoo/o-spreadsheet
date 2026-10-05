"""Port of the range/zone/coordinate helpers used by the squisher."""

from dataclasses import dataclass, field, replace
from typing import NamedTuple

from ._js import get_canonical_symbol_name, js_trim, unquote
from .tokenizer import INVALID_REFERENCE, is_range_reference, is_row_reference


def _letters_to_number(letters: str) -> int:
    result = 0
    for char in letters:
        result = result * 26 + _char_to_number(char)
    return result - 1


def _char_to_number(char: str) -> int:
    code = ord(char)
    return code - 64 if 65 <= code <= 90 else code - 96


MAX_COL = _letters_to_number("ZZZ")
MAX_ROW = 9999998


def number_to_letters(n: int) -> str:
    if n < 0:
        raise ValueError(f"number must be positive. Got {n}")
    if n < 26:
        return chr(65 + n)
    return number_to_letters(n // 26 - 1) + number_to_letters(n % 26)


def _is_letter(c: str) -> bool:
    return "A" <= c <= "Z" or "a" <= c <= "z"


def _is_digit(c: str) -> bool:
    return "0" <= c <= "9"


class _Chars:
    __slots__ = ("text", "i")

    def __init__(self, text: str):
        self.text = text
        self.i = 0

    @property
    def current(self) -> str:
        return self.text[self.i] if self.i < len(self.text) else ""

    def consume_spaces(self):
        while self.current == " ":
            self.i += 1

    def consume_letters(self) -> int:
        if self.current == "$":
            self.i += 1
        if not self.current or not _is_letter(self.current):
            return -1
        col = 0
        while self.current and _is_letter(self.current):
            col = col * 26 + _char_to_number(self.current)
            self.i += 1
        return col

    def consume_digits(self) -> int:
        if self.current == "$":
            self.i += 1
        if not self.current or not _is_digit(self.current):
            return -1
        num = 0
        while self.current and _is_digit(self.current):
            num = num * 10 + int(self.current)
            self.i += 1
        return num


def to_cartesian(xc: str) -> tuple[int, int]:
    """'B3' -> (col=1, row=2)"""
    chars = _Chars(xc)
    chars.consume_spaces()
    letters = chars.consume_letters()
    if letters == -1 or not chars.current:
        raise ValueError(f"Invalid cell description: {xc}")
    num = chars.consume_digits()
    chars.consume_spaces()
    col, row = letters - 1, num - 1
    if chars.i < len(xc) or col > MAX_COL or row > MAX_ROW:
        raise ValueError(f"Invalid cell description: {xc}")
    return col, row


def to_xc(col: int, row: int) -> str:
    return number_to_letters(col) + str(row + 1)


class Zone(NamedTuple):
    left: int
    top: int
    right: int
    bottom: int


class UnboundedZone(NamedTuple):
    left: int
    top: int
    right: int | None
    bottom: int | None
    has_header: bool = False


class RangePart(NamedTuple):
    col_fixed: bool
    row_fixed: bool


def to_unbounded_zone(xc: str) -> UnboundedZone:
    chars = _Chars(xc)
    chars.consume_spaces()
    sheet_separator = xc.find("!")
    if sheet_separator != -1:
        chars.i += sheet_separator + 1
    left_letters = chars.consume_letters()
    left_numbers = chars.consume_digits()
    full_col = full_row = has_header = False
    if left_numbers == -1:
        left = right = left_letters - 1
        top = bottom = 0
        full_col = True
    elif left_letters == -1:
        top = bottom = left_numbers - 1
        left = right = 0
        full_row = True
    else:
        left = right = left_letters - 1
        top = bottom = left_numbers - 1
        has_header = True
    chars.consume_spaces()
    if chars.current == ":":
        chars.i += 1
        chars.consume_spaces()
        right_letters = chars.consume_letters()
        right_numbers = chars.consume_digits()
        if right_numbers == -1:
            right = right_letters - 1
            full_col = True
        elif right_letters == -1:
            bottom = right_numbers - 1
            full_row = True
        else:
            right = right_letters - 1
            bottom = right_numbers - 1
            top = bottom if full_col else top
            left = right if full_row else left
            has_header = True
    zone_bottom = None if full_col else bottom
    zone_right = None if full_row else right
    # reorderZone
    if zone_right is not None and left > zone_right:
        left, zone_right = zone_right, left
    if zone_bottom is not None and top > zone_bottom:
        top, zone_bottom = zone_bottom, top
    if (zone_bottom is not None and zone_bottom > MAX_ROW) or (
        zone_right is not None and zone_right > MAX_COL
    ):
        raise ValueError(f"Range string out of bounds: {xc}")
    if zone_bottom is None and zone_right is None:
        raise ValueError("Wrong zone xc. The zone cannot be at the same time a full column and a full row")
    return UnboundedZone(left, top, zone_right, zone_bottom, has_header and (full_row or full_col))


def to_zone(xc: str) -> Zone:
    z = to_unbounded_zone(xc)
    if z.bottom is None or z.right is None:
        raise ValueError("This does not support unbounded ranges")
    return Zone(z.left, z.top, z.right, z.bottom)


# -----------------------------------------------------------------------------
# Sheets
# -----------------------------------------------------------------------------


@dataclass
class SheetInfo:
    id: str
    name: str
    number_of_rows: int = 100
    number_of_cols: int = 26


def _standardized_sheet_name(name: str) -> str:
    return unquote(js_trim(name).upper(), "'")


@dataclass
class Sheets:
    """The subset of the core getters the squisher needs: sheet ids, names and sizes."""

    sheets: list[SheetInfo]
    _by_id: dict = field(init=False, repr=False)
    _by_name: dict = field(init=False, repr=False)

    def __post_init__(self):
        self._by_id = {sheet.id: sheet for sheet in self.sheets}
        self._by_name = {_standardized_sheet_name(sheet.name): sheet.id for sheet in self.sheets}

    @classmethod
    def from_workbook_data(cls, data: dict) -> "Sheets":
        return cls(
            [
                SheetInfo(
                    id=sheet["id"],
                    name=sheet["name"],
                    number_of_rows=sheet.get("rowNumber", 100),
                    number_of_cols=sheet.get("colNumber", 26),
                )
                for sheet in data.get("sheets", [])
            ]
        )

    def get_sheet_id_by_name(self, name: str | None) -> str | None:
        if name:
            return self._by_name.get(_standardized_sheet_name(name))
        return None

    def get_sheet_name(self, sheet_id: str) -> str:
        return self._by_id[sheet_id].name

    def has_sheet(self, sheet_id: str) -> bool:
        return sheet_id in self._by_id

    def get_sheet_size(self, sheet_id: str) -> tuple[int, int]:
        sheet = self._by_id[sheet_id]
        return sheet.number_of_rows, sheet.number_of_cols


# -----------------------------------------------------------------------------
# Range
# -----------------------------------------------------------------------------


@dataclass(slots=True)
class Range:
    sheet_id: str
    zone: Zone
    unbounded_zone: UnboundedZone
    parts: tuple[RangePart, ...]
    prefix_sheet: bool = False
    invalid_sheet_name: str | None = None
    invalid_xc: str | None = None

    def copy(self) -> "Range":
        return replace(self)


def split_reference(ref: str) -> tuple[str | None, str]:
    if "!" not in ref:
        return None, ref
    parts = ref.split("!")
    xc = parts.pop()
    sheet_name = unquote("!".join(parts), "'") or None
    return sheet_name, xc


def _create_invalid_range(sheet_xc: str) -> Range:
    zone = Zone(-1, -1, -1, -1)
    return Range("", zone, UnboundedZone(-1, -1, -1, -1), (), False, None, sheet_xc)


def _get_range_parts(xc: str, zone: UnboundedZone) -> list[list[bool]]:
    parts = []
    for p in xc.split(":"):
        full_row = is_row_reference(p)
        parts.append(
            [
                False if full_row else p.startswith("$"),
                p.startswith("$") if full_row else "$" in p[1:],
            ]
        )
    if zone.bottom is None:  # full col
        parts[0][1] = parts[1][1] = parts[0][1] or parts[1][1]
    if zone.right is None:  # full row
        parts[0][0] = parts[1][0] = parts[0][0] or parts[1][0]
    return parts


def get_range_from_sheet_xc(sheets: Sheets, default_sheet_id: str, sheet_xc: str) -> Range:
    if not is_range_reference(sheet_xc):
        return _create_invalid_range(sheet_xc)
    sheet_name, xc = split_reference(sheet_xc)
    sheet_id = sheets.get_sheet_id_by_name(sheet_name) or default_sheet_id
    if not sheet_id or not sheets.has_sheet(sheet_id):
        return _create_invalid_range(sheet_xc)
    invalid_sheet_name = sheet_name if sheet_name and not sheets.get_sheet_id_by_name(sheet_name) else None

    unbounded = to_unbounded_zone(xc)
    parts = tuple(RangePart(c, r) for c, r in _get_range_parts(xc, unbounded))
    # createRange
    number_of_rows, number_of_cols = sheets.get_sheet_size(sheet_id)
    zone = Zone(
        unbounded.left,
        unbounded.top,
        number_of_cols - 1 if unbounded.right is None else unbounded.right,
        number_of_rows - 1 if unbounded.bottom is None else unbounded.bottom,
    )
    area = (zone.bottom - zone.top + 1) * (zone.right - zone.left + 1)
    if len(parts) == 1 and area > 1:
        parts = (parts[0], parts[0])
    elif len(parts) == 2 and area == 1:
        parts = (parts[0],)
    return Range(sheet_id, zone, unbounded, parts, bool(sheet_name), invalid_sheet_name, None)


def _range_part_string(rng: Range, part: int) -> str:
    rp = rng.parts[part] if part < len(rng.parts) else None
    col_fixed = "$" if rp and rp.col_fixed else ""
    row_fixed = "$" if rp and rp.row_fixed else ""
    col = number_to_letters(rng.zone.left if part == 0 else rng.zone.right)
    row = str((rng.zone.top if part == 0 else rng.zone.bottom) + 1)
    uz = rng.unbounded_zone
    if uz.bottom is None:  # full col
        if part == 0 and uz.has_header:
            return col_fixed + col + row_fixed + row
        return col_fixed + col
    if uz.right is None:  # full row
        if part == 0 and uz.has_header:
            return col_fixed + col + row_fixed + row
        return row_fixed + row
    return col_fixed + col + row_fixed + row


def get_range_string(
    rng: Range, for_sheet_id: str | None, sheets: Sheets, do_not_simplify_range: bool = False
) -> str:
    """helpers/range.ts getRangeString"""
    if rng.invalid_xc:
        return rng.invalid_xc
    zone = rng.zone
    if zone.bottom - zone.top < 0 or zone.right - zone.left < 0:
        return INVALID_REFERENCE
    if zone.left < 0 or zone.top < 0:
        return INVALID_REFERENCE
    prefix_sheet = (
        not for_sheet_id or rng.sheet_id != for_sheet_id or rng.invalid_sheet_name or rng.prefix_sheet
    )
    sheet_name = ""
    if prefix_sheet:
        if rng.invalid_sheet_name:
            sheet_name = get_canonical_symbol_name(rng.invalid_sheet_name)
        else:
            sheet_name = get_canonical_symbol_name(sheets.get_sheet_name(rng.sheet_id))
    if prefix_sheet and not sheet_name:
        return INVALID_REFERENCE
    result = _range_part_string(rng, 0)
    if len(rng.parts) == 2:
        p0, p1 = rng.parts
        if (
            zone.top != zone.bottom
            or zone.left != zone.right
            or p0.row_fixed
            or p0.col_fixed
            or p1.row_fixed
            or p1.col_fixed
            or do_not_simplify_range
        ):
            result += ":" + _range_part_string(rng, 1)
    return f"{sheet_name}!{result}" if prefix_sheet else result


def getters_range_string(
    rng: Range, for_sheet_id: str | None, sheets: Sheets, do_not_simplify_range: bool = False
) -> str:
    """plugins/core/range.ts getRangeString (the getter)"""
    if rng.invalid_xc:
        return rng.invalid_xc
    if not sheets.has_sheet(rng.sheet_id):
        return INVALID_REFERENCE
    return get_range_string(rng, for_sheet_id, sheets, do_not_simplify_range)
