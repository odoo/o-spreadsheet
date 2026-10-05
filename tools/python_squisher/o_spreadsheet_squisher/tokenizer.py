"""Port of src/formulas/tokenizer.ts and src/formulas/range_tokenizer.ts (default locale only)."""

import re
import unicodedata
from dataclasses import dataclass

from ._js import RE_JS_DOT, RE_JS_WS

NEWLINE = "\n"
INVALID_REFERENCE = "#REF"
DEBUGGER_CHAR = "?"
ARG_SEPARATOR = ","
ARRAY_ROW_SEPARATOR = ";"
DECIMAL_SEPARATOR = "."
OPERATORS = ["+", "-", "*", "/", ":", "=", "<>", ">=", ">", "<=", "<", "^", "&", "#", "%"]

# see `specialWhiteSpaceSpecialCharacters` in helpers/misc.ts
SPECIAL_WHITESPACES = frozenset(
    "\t\f\v\u00a0\u1680\u2000\u200a\u2028\u2029\u202f\u205f\u3000\ufeff"
)

SYMBOL_CHARS = frozenset("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_.!$")

_FLAGS = re.IGNORECASE | re.ASCII

# helpers/references.ts
_SHEET_PREFIX = rf"('{RE_JS_DOT}+'!|[^']+!)?"
_CELL_REFERENCE = r"\$?([A-Z]{1,3})\$?([0-9]{1,7})"
_FULL_ROW_XC = rf"(\$?[A-Z]{{1,3}})?\$?[0-9]{{1,7}}{RE_JS_WS}*:{RE_JS_WS}*(\$?[A-Z]{{1,3}})?\$?[0-9]{{1,7}}{RE_JS_WS}*"
_FULL_COL_XC = rf"\$?[A-Z]{{1,3}}(\$?[0-9]{{1,7}})?{RE_JS_WS}*:{RE_JS_WS}*\$?[A-Z]{{1,3}}(\$?[0-9]{{1,7}})?{RE_JS_WS}*"

RANGE_REFERENCE = re.compile(
    rf"^{RE_JS_WS}*{_SHEET_PREFIX}({_CELL_REFERENCE}|{_FULL_ROW_XC}|{_FULL_COL_XC})\Z", _FLAGS
)
_SINGLE_CELL_REFERENCE = re.compile(rf"^{_CELL_REFERENCE}\Z", _FLAGS)
_COL_HEADER = re.compile(r"^\$?([A-Z]{1,3})+\Z", _FLAGS)
_ROW_HEADER = re.compile(r"^\$?([0-9]{1,7})+\Z", _FLAGS)
_COL_REFERENCE = re.compile(rf"^{RE_JS_WS}*{_SHEET_PREFIX}\$?([A-Z]{{1,3}})\Z", _FLAGS)
_ROW_REFERENCE = re.compile(rf"^{RE_JS_WS}*{_SHEET_PREFIX}\$?([0-9]{{1,7}})\Z", _FLAGS)

_FORMULA_NUMBER = re.compile(
    r"(?:^-?\d+(?:\.?\d*(?:(E|e)(\+|-)?\d+)?)?|^-?\.\d+)(?!\w|!)", re.ASCII
)


def is_range_reference(xc: str) -> bool:
    return RANGE_REFERENCE.search(xc) is not None


def is_single_cell_reference(xc: str) -> bool:
    return _SINGLE_CELL_REFERENCE.search(xc) is not None


def is_col_header(xc: str) -> bool:
    return _COL_HEADER.search(xc) is not None


def is_row_header(xc: str) -> bool:
    return _ROW_HEADER.search(xc) is not None


def is_col_reference(xc: str) -> bool:
    return _COL_REFERENCE.search(xc) is not None


def is_row_reference(xc: str) -> bool:
    return _ROW_REFERENCE.search(xc) is not None


@dataclass(slots=True)
class Token:
    type: str
    value: str


def has_special_whitespace(text: str) -> bool:
    return any(c in SPECIAL_WHITESPACES for c in text)


def _is_symbol_char(c: str) -> bool:
    # JS: SYMBOL_CHARS or /\p{L}|\p{N}|_|\.|!|\$/u
    return c in SYMBOL_CHARS or unicodedata.category(c)[0] in ("L", "N")


def tokenize(text: str) -> list[Token]:
    text = re.sub(r"\r\n|\r", NEWLINE, text)
    special_space = has_special_whitespace(text)
    n = len(text)
    i = 0
    result: list[Token] = []
    while i < n:
        c = text[i]
        # new lines
        if c == NEWLINE:
            j = i
            while j < n and text[j] == NEWLINE:
                j += 1
            result.append(Token("SPACE", text[i:j]))
            i = j
            continue
        # spaces
        if c == " " or (special_space and c in SPECIAL_WHITESPACES):
            j = i
            while j < n and (text[j] == " " or (special_space and text[j] in SPECIAL_WHITESPACES)):
                j += 1
            result.append(Token("SPACE", text[i:j]))
            i = j
            continue
        if c == ARRAY_ROW_SEPARATOR:
            result.append(Token("ARRAY_ROW_SEPARATOR", c))
            i += 1
            continue
        if c == ARG_SEPARATOR:
            result.append(Token("ARG_SEPARATOR", c))
            i += 1
            continue
        if c == "{":
            result.append(Token("LEFT_BRACE", c))
            i += 1
            continue
        if c == "}":
            result.append(Token("RIGHT_BRACE", c))
            i += 1
            continue
        if c == "(":
            result.append(Token("LEFT_PAREN", c))
            i += 1
            continue
        if c == ")":
            result.append(Token("RIGHT_PAREN", c))
            i += 1
            continue
        if text.startswith(INVALID_REFERENCE, i):
            result.append(Token("INVALID_REFERENCE", INVALID_REFERENCE))
            i += len(INVALID_REFERENCE)
            continue
        operator = next((op for op in OPERATORS if text.startswith(op, i)), None)
        if operator:
            result.append(Token("OPERATOR", operator))
            i += len(operator)
            continue
        if c == '"':
            j = i + 1
            while j < n and (text[j] != '"' or text[j - 1] == "\\"):
                j += 1
            if j < n:  # closing quote
                j += 1
            result.append(Token("STRING", text[i:j]))
            i = j
            continue
        if c == DEBUGGER_CHAR:
            result.append(Token("DEBUGGER", c))
            i += 1
            continue
        if c in "0123456789" or c == DECIMAL_SEPARATOR:
            match = _FORMULA_NUMBER.match(text[i:])
            if match:
                result.append(Token("NUMBER", match.group(0)))
                i += match.end()
                continue
        token, i = _tokenize_symbol(text, i)
        if token:
            result.append(token)
            continue
        result.append(Token("UNKNOWN", text[i]))
        i += 1
    return result


def _tokenize_symbol(text: str, i: int) -> tuple[Token | None, int]:
    n = len(text)
    start = i
    if text[i] == "'":
        last_char = text[i]
        i += 1
        while i < n:
            last_char = text[i]
            i += 1
            if last_char == "'":
                if i < n and text[i] == "'":
                    i += 1
                else:
                    break
        if last_char != "'":
            return Token("UNKNOWN", text[start:i]), i
    while i < n and _is_symbol_char(text[i]):
        i += 1
    if i == start:
        return None, i
    value = text[start:i]
    if is_range_reference(value):
        return Token("REFERENCE", value), i
    return Token("SYMBOL", value), i


# -----------------------------------------------------------------------------
# Range tokenizer
# -----------------------------------------------------------------------------

_LEFT_REF, _RIGHT_REF, _SEPARATOR, _FULL_COL_SEP, _FULL_ROW_SEP, _RIGHT_COL_REF, _RIGHT_ROW_REF, _FOUND = range(8)


def _always(_token: Token) -> bool:
    return True


def _is_range_operator(token: Token) -> bool:
    return token.value == ":"


_MACHINE = {
    _LEFT_REF: {
        "REFERENCE": [(_SEPARATOR, _always)],
        "NUMBER": [(_FULL_ROW_SEP, _always)],
        "SYMBOL": [
            (_FULL_COL_SEP, lambda t: is_col_reference(t.value)),
            (_FULL_ROW_SEP, lambda t: is_row_reference(t.value)),
        ],
    },
    _FULL_COL_SEP: {
        "SPACE": [(_FULL_COL_SEP, _always)],
        "OPERATOR": [(_RIGHT_COL_REF, _is_range_operator)],
    },
    _FULL_ROW_SEP: {
        "SPACE": [(_FULL_ROW_SEP, _always)],
        "OPERATOR": [(_RIGHT_ROW_REF, _is_range_operator)],
    },
    _SEPARATOR: {
        "SPACE": [(_SEPARATOR, _always)],
        "OPERATOR": [(_RIGHT_REF, _is_range_operator)],
    },
    _RIGHT_REF: {
        "SPACE": [(_RIGHT_REF, _always)],
        "NUMBER": [(_FOUND, _always)],
        "REFERENCE": [(_FOUND, lambda t: is_single_cell_reference(t.value))],
        "SYMBOL": [(_FOUND, lambda t: is_col_header(t.value) or is_row_header(t.value))],
    },
    _RIGHT_COL_REF: {
        "SPACE": [(_RIGHT_COL_REF, _always)],
        "SYMBOL": [(_FOUND, lambda t: is_col_header(t.value))],
        "REFERENCE": [(_FOUND, lambda t: is_single_cell_reference(t.value))],
    },
    _RIGHT_ROW_REF: {
        "SPACE": [(_RIGHT_ROW_REF, _always)],
        "NUMBER": [(_FOUND, _always)],
        "REFERENCE": [(_FOUND, lambda t: is_single_cell_reference(t.value))],
        "SYMBOL": [(_FOUND, lambda t: is_row_header(t.value))],
    },
}


def _match_reference(tokens: list[Token], start: int) -> tuple[Token | None, int]:
    head = start
    transitions = _MACHINE[_LEFT_REF]
    matched = ""
    while True:
        if head >= len(tokens):
            return None, start
        token = tokens[head]
        head += 1
        next_state = next(
            (state for state, guard in transitions.get(token.type, ()) if guard(token)), None
        )
        if next_state is None:
            return None, start
        matched += token.value
        if next_state == _FOUND:
            return Token("REFERENCE", matched), head
        transitions = _MACHINE[next_state]


def range_tokenize(formula: str) -> list[Token]:
    tokens = tokenize(formula)
    result: list[Token] = []
    i = 0
    while i < len(tokens):
        token, next_index = _match_reference(tokens, i)
        if token:
            result.append(token)
            i = next_index
        else:
            result.append(tokens[i])
            i += 1
    return result
