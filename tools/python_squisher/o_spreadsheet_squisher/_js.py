"""Small helpers reproducing JavaScript semantics the TS implementation relies on.

The squished output must be byte-identical to what o-spreadsheet produces, so
number formatting, whitespace classes and string trimming follow the JS rules
rather than the Python ones.
"""

import math
from decimal import Decimal

# Equivalent of JS `\s` (and of the characters removed by String.prototype.trim)
JS_WHITESPACES = (
    "\t\n\v\f\r \u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006"
    "\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff"
)
# regex snippets equivalent to JS `\s` and `.` (without the `s` flag)
RE_JS_WS = "[\t\n\v\f\r \u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]"
RE_JS_DOT = "[^\n\r\u2028\u2029]"


def js_trim(text: str) -> str:
    return text.strip(JS_WHITESPACES)


def js_number_to_string(value: float) -> str:
    """Number.prototype.toString() (radix 10)."""
    value = float(value)
    if math.isnan(value):
        return "NaN"
    if math.isinf(value):
        return "Infinity" if value > 0 else "-Infinity"
    if value == 0:
        return "0"
    sign = "-" if value < 0 else ""
    # repr() gives the shortest round-tripping digits, exactly like JS
    _, digit_tuple, exponent = Decimal(repr(abs(value))).as_tuple()
    digits = "".join(map(str, digit_tuple)).rstrip("0")
    exponent += len(digit_tuple) - len(digits)
    k = len(digits)
    n = exponent + k  # value = 0.digits * 10^n
    if k <= n <= 21:
        result = digits + "0" * (n - k)
    elif 0 < n <= 21:
        result = digits[:n] + "." + digits[n:]
    elif -6 < n <= 0:
        result = "0." + "0" * (-n) + digits
    else:
        e = n - 1
        exp = ("+" if e >= 0 else "-") + str(abs(e))
        if k == 1:
            result = digits + "e" + exp
        else:
            result = digits[0] + "." + digits[1:] + "e" + exp
    return sign + result


def unquote(text: str, quote_char: str = '"') -> str:
    if text.startswith(quote_char):
        text = text[1:]
    if text.endswith(quote_char):
        text = text[:-1]
    return text


def get_canonical_symbol_name(symbol_name: str) -> str:
    """Quote the name if it contains any non `\\w` (ASCII) character."""
    if not symbol_name or any(not (c.isascii() and (c.isalnum() or c == "_")) for c in symbol_name):
        return f"'{symbol_name}'"
    return symbol_name
