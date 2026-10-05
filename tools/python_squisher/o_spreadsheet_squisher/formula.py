"""What the squisher needs to know about a formula: its shape and its literals.

The o-spreadsheet unsquisher compiles the base formula itself and applies the offsets by position,
so the numbers, strings and references must be found in the same order as in
`formulaArguments` (src/formulas/compiler.ts), and the shape must be the same as its
`compilationCacheKey`.

The formulas are assumed to be valid: an invalid formula (unknown function, syntax error...) has
no literals nor references in o-spreadsheet, so two of them with the same shape must not be squished
against each other.
"""

from dataclasses import dataclass

from ._js import unquote
from .references import Reference
from .tokenizer import Token, has_special_whitespace, range_tokenize


def compilation_cache_key(tokens: list[Token]) -> str:
    key = []
    for token in tokens:
        t = token.type
        if t == "STRING":
            key.append("|S|")
        elif t == "NUMBER":
            key.append("|N|")
        elif t in ("REFERENCE", "INVALID_REFERENCE"):
            key.append("|R|" if ":" in token.value else "|C|")
        elif t == "SPACE":
            continue
        else:
            key.append(token.value)
    return "".join(key)


@dataclass
class Formula:
    text: str
    normalized: str
    numbers: list[float]
    strings: list[str]
    symbols: list[str]
    references: list[Reference]
    # o-spreadsheet may tokenize it differently (see `has_special_whitespace`): never squish it
    is_squishable: bool = True

    @classmethod
    def from_text(cls, text: str) -> "Formula":
        tokens = range_tokenize(text)
        numbers: list[float] = []
        strings: list[str] = []
        symbols: list[str] = []
        references: list[Reference] = []
        for token in tokens:
            t = token.type
            if t in ("REFERENCE", "INVALID_REFERENCE"):
                references.append(Reference.from_token(token.value))
            elif t == "STRING":
                strings.append(unquote(token.value))
            elif t == "NUMBER":
                # parseNumber(str, DEFAULT_LOCALE): number tokens only contain [0-9.eE+-]
                numbers.append(float(token.value))
            elif t == "SYMBOL":
                symbols.append(unquote(token.value, "'"))
        return cls(
            text,
            compilation_cache_key(tokens),
            numbers,
            strings,
            symbols,
            references,
            not has_special_whitespace(text),
        )

    def uses_symbol(self, symbol: str) -> bool:
        target = symbol.casefold()
        return any(s.casefold() == target for s in self.symbols)
