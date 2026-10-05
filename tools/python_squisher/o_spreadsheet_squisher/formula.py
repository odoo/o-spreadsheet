"""Port of the parts of src/formulas/{parser,compiler}.ts that the squisher depends on.

We never execute formulas: compiling only extracts the "normalized" formula (structure with
placeholders), the literal values and the range dependencies, and decides whether the formula is a
"bad expression". That last bit matters: o-spreadsheet does not keep literals/dependencies of bad
expressions, so their cells must never be squished as offsets of each other.
"""

import json
import math
import re
from dataclasses import dataclass, field
from importlib import resources

from ._js import js_number_to_string, unquote
from .ranges import Range, Sheets, get_range_from_sheet_xc, getters_range_string
from .tokenizer import INVALID_REFERENCE, Token, range_tokenize

# -----------------------------------------------------------------------------
# Function registry (only what the compiler checks: existence and argument counts)
# -----------------------------------------------------------------------------


@dataclass(frozen=True)
class ArgSpec:
    optional: bool = False  # `optional || default` in the TS description
    repeating: bool = False


@dataclass(frozen=True)
class FunctionSpec:
    args: tuple[ArgSpec, ...]
    min_arg_required: int
    max_arg_possible: float
    nbr_arg_repeating: int
    nbr_optional_non_repeating_args: int

    @classmethod
    def from_args(cls, args) -> "FunctionSpec":
        """Same computation as `addMetaInfoFromArg` in functions/arguments.ts"""
        args = tuple(args)
        min_arg = sum(1 for a in args if not a.optional)
        repeating = sum(1 for a in args if a.repeating)
        optional = sum(1 for a in args if a.optional and not a.repeating)
        return cls(args, min_arg, math.inf if repeating else len(args), repeating, optional)


class FunctionRegistry:
    """Known spreadsheet functions, keyed by upper-case name.

    `FunctionRegistry.builtin()` loads the functions shipped with o-spreadsheet (see
    builtin_functions.json, generated from the TS registry). Functions added at runtime
    (e.g. by Odoo: ODOO.PIVOT, ODOO.LIST, ...) must be registered too, otherwise formulas using them
    are considered invalid and won't be squished (which is safe, only less compact).
    """

    def __init__(self, functions: dict[str, FunctionSpec] | None = None):
        self.functions: dict[str, FunctionSpec] = dict(functions or {})

    @classmethod
    def builtin(cls) -> "FunctionRegistry":
        raw = json.loads(
            resources.files(__package__).joinpath("builtin_functions.json").read_text("utf-8")
        )
        registry = cls()
        for name, args in raw.items():
            registry.add(name, [ArgSpec(bool(o), bool(r)) for o, r in args])
        return registry

    def add(self, name: str, args) -> "FunctionRegistry":
        """`args`: iterable of ArgSpec (or of (optional, repeating) tuples)."""
        args = [a if isinstance(a, ArgSpec) else ArgSpec(*a) for a in args]
        self.functions[name.upper()] = FunctionSpec.from_args(args)
        return self

    def get(self, name: str) -> FunctionSpec | None:
        return self.functions.get(name)


# -----------------------------------------------------------------------------
# Parser (only used to validate the formula structure)
# -----------------------------------------------------------------------------


class BadExpressionError(Exception):
    pass


OP_PRIORITY = {
    "#": 40,
    "%": 40,
    "^": 30,
    "*": 20,
    "/": 20,
    "+": 15,
    "-": 15,
    "&": 13,
    ">": 10,
    "<>": 10,
    ">=": 10,
    "<": 10,
    "<=": 10,
    "=": 10,
}
_UNARY_PREFIX = ("-", "+")
_UNARY_POSTFIX = ("%", "#")
_FUNCTION_REGEX = re.compile(r"[a-zA-Z0-9_]+(\.[a-zA-Z0-9_]+)*")


@dataclass(slots=True)
class Ast:
    type: str
    value: object = None
    args: list = field(default_factory=list)  # FUNCALL args, ARRAY rows, operands


class _TokenList:
    def __init__(self, tokens: list[Token]):
        self.tokens = tokens
        self.index = 0

    @property
    def current(self) -> Token | None:
        return self.tokens[self.index] if self.index < len(self.tokens) else None

    @property
    def next(self) -> Token | None:
        i = self.index + 1
        return self.tokens[i] if i < len(self.tokens) else None

    def shift(self) -> Token | None:
        token = self.current
        self.index += 1
        return token


def _is_funcall_token(current: Token, next_token: Token | None) -> bool:
    return (
        next_token is not None
        and next_token.type == "LEFT_PAREN"
        and _FUNCTION_REGEX.search(current.value) is not None
        and current.value == unquote(current.value, "'")
    )


def _consume_or_throw(tokens: _TokenList, token_type: str) -> Token:
    token = tokens.shift()
    if not token or token.type != token_type:
        raise BadExpressionError()
    return token


def _parse_operand(tokens: _TokenList) -> Ast:
    current = tokens.shift()
    if not current:
        raise BadExpressionError()
    t = current.type
    if t == "DEBUGGER":
        return _parse_expression(tokens, 1000)
    if t == "NUMBER":
        return Ast("NUMBER")
    if t == "STRING":
        return Ast("STRING")
    if t == "INVALID_REFERENCE":
        return Ast("REFERENCE", INVALID_REFERENCE)
    if t == "REFERENCE":
        if (
            tokens.current
            and tokens.current.value == ":"
            and tokens.next
            and tokens.next.type == "REFERENCE"
        ):
            tokens.shift()
            right = tokens.shift()
            return Ast("REFERENCE", f"{current.value}:{right.value}")
        return Ast("REFERENCE", current.value)
    if t == "SYMBOL":
        if _is_funcall_token(current, tokens.current):
            return Ast("FUNCALL", current.value, _parse_function_args(tokens))
        if current.value.upper() in ("TRUE", "FALSE"):
            return Ast("BOOLEAN")
        return Ast("SYMBOL", unquote(current.value, "'"))
    if t == "LEFT_PAREN":
        result = _parse_expression(tokens)
        _consume_or_throw(tokens, "RIGHT_PAREN")
        return result
    if t == "LEFT_BRACE":
        return _parse_array_literal(tokens)
    if t == "OPERATOR" and current.value in _UNARY_PREFIX:
        operand = _parse_expression(tokens, OP_PRIORITY[current.value])
        return Ast("UNARY_OPERATION", current.value, [operand])
    raise BadExpressionError(f"Unexpected token: {current.value}")


def _parse_function_args(tokens: _TokenList) -> list[Ast]:
    _consume_or_throw(tokens, "LEFT_PAREN")
    if tokens.current and tokens.current.type == "RIGHT_PAREN":
        tokens.shift()
        return []
    args = [_parse_one_function_arg(tokens)]
    while not (tokens.current and tokens.current.type == "RIGHT_PAREN"):
        _consume_or_throw(tokens, "ARG_SEPARATOR")
        args.append(_parse_one_function_arg(tokens))
    _consume_or_throw(tokens, "RIGHT_PAREN")
    return args


def _parse_one_function_arg(tokens: _TokenList) -> Ast:
    current = tokens.current
    if current and current.type in ("ARG_SEPARATOR", "RIGHT_PAREN"):
        return Ast("EMPTY", "")
    return _parse_expression(tokens)


def _parse_array_literal(tokens: _TokenList) -> Ast:
    rows = []
    current_row = [_parse_expression(tokens)]
    while not (tokens.current and tokens.current.type == "RIGHT_BRACE"):
        next_token = tokens.shift()
        if not next_token:
            raise BadExpressionError("Missing closing brace")
        if next_token.type == "ARG_SEPARATOR":
            current_row.append(_parse_expression(tokens))
        elif next_token.type == "ARRAY_ROW_SEPARATOR":
            rows.append(current_row)
            current_row = [_parse_expression(tokens)]
        else:
            raise BadExpressionError(f"Unexpected token: {next_token.value}")
    _consume_or_throw(tokens, "RIGHT_BRACE")
    rows.append(current_row)
    return Ast("ARRAY", None, rows)


def _parse_expression(tokens: _TokenList, parent_priority: int = 0) -> Ast:
    if len(tokens.tokens) == 0:
        raise BadExpressionError()
    left = _parse_operand(tokens)
    while (
        tokens.current
        and tokens.current.type == "OPERATOR"
        and OP_PRIORITY.get(tokens.current.value, -math.inf) > parent_priority
    ):
        operator = tokens.shift().value
        if operator in _UNARY_POSTFIX:
            left = Ast("UNARY_OPERATION", operator, [left])
        else:
            right = _parse_expression(tokens, OP_PRIORITY[operator])
            left = Ast("BIN_OPERATION", operator, [left, right])
    return left


def parse_tokens(tokens: list[Token]) -> Ast:
    token_list = _TokenList([t for t in tokens if t.type != "SPACE"])
    if token_list.current and token_list.current.value == "=":
        token_list.shift()
    result = _parse_expression(token_list)
    if token_list.current:
        raise BadExpressionError()
    return result


# -----------------------------------------------------------------------------
# Compiler checks
# -----------------------------------------------------------------------------


def _arg_targeting_covers(spec: FunctionSpec, nbr_arg_supplied: int) -> bool:
    """`_argTargeting` in functions/arguments.ts. The compiler crashes (=> bad expression) when a
    supplied value does not map to an argument definition."""
    groups = (
        math.floor((nbr_arg_supplied - spec.min_arg_required) / spec.nbr_arg_repeating)
        if spec.nbr_arg_repeating
        else 0
    )
    nbr_value_optional = nbr_arg_supplied - spec.min_arg_required - spec.nbr_arg_repeating * groups
    mapped: dict[int, int] = {}
    count_supplied = count_optional = 0
    i = 0
    while i < len(spec.args):
        arg = spec.args[i]
        if arg.optional and not arg.repeating:
            if count_optional < nbr_value_optional:
                mapped[count_supplied] = i
                count_supplied += 1
            count_optional += 1
            i += 1
            continue
        if arg.repeating:
            mandatory_groups = 0 if arg.optional else 1
            for _ in range(groups + mandatory_groups):
                for k in range(spec.nbr_arg_repeating):
                    mapped[count_supplied] = i + k
                    count_supplied += 1
            i += spec.nbr_arg_repeating
            continue
        mapped[count_supplied] = i
        count_supplied += 1
        i += 1
    return all(j in mapped and mapped[j] < len(spec.args) for j in range(nbr_arg_supplied))


def _assert_enough_args(spec: FunctionSpec, nbr_arg_supplied: int):
    if nbr_arg_supplied < spec.min_arg_required:
        raise BadExpressionError("Invalid number of arguments")
    if nbr_arg_supplied > spec.max_arg_possible:
        raise BadExpressionError("Invalid number of arguments")
    if spec.nbr_arg_repeating > 1:
        nbr_value_repeating = spec.nbr_arg_repeating * math.floor(
            (nbr_arg_supplied - spec.min_arg_required) / spec.nbr_arg_repeating
        )
        remaining = (
            nbr_arg_supplied
            - spec.min_arg_required
            - nbr_value_repeating
            - spec.nbr_optional_non_repeating_args
        )
        if remaining > 0:
            raise BadExpressionError("Invalid number of arguments")


def _check_ast(ast: Ast, functions: FunctionRegistry):
    if ast.type == "ARRAY":
        # a literal array is compiled into ARRAY.LITERAL(ARRAY.ROW(...), ...)
        ast = Ast("FUNCALL", "ARRAY.LITERAL", [Ast("FUNCALL", "ARRAY.ROW", row) for row in ast.args])
    if ast.type == "FUNCALL":
        spec = functions.get(ast.value.upper())
        if spec is None:
            raise BadExpressionError(f"Unknown function: {ast.value}")
        _assert_enough_args(spec, len(ast.args))
        if not _arg_targeting_covers(spec, len(ast.args)):
            raise BadExpressionError("Invalid arguments")
    if ast.type in ("FUNCALL", "UNARY_OPERATION", "BIN_OPERATION"):
        for child in ast.args:
            _check_ast(child, functions)


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
class CompiledFormula:
    sheet_id: str
    tokens: list[Token]
    numbers: list[float]
    strings: list[str]
    symbols: list[str]
    range_dependencies: list[Range]
    is_bad_expression: bool
    normalized_formula: str

    def uses_symbol(self, symbol: str) -> bool:
        target = symbol.casefold()
        return any(s.casefold() == target for s in self.symbols)

    def literal_values(self):
        return self.numbers, self.strings

    def with_values(
        self, dependencies: list[Range], numbers: list[float], strings: list[str]
    ) -> "CompiledFormula":
        """CompiledFormula.CopyWithDependenciesAndLiteral"""
        return CompiledFormula(
            self.sheet_id,
            self.tokens,
            list(numbers),
            list(strings),
            self.symbols,
            [d.copy() for d in dependencies],
            self.is_bad_expression,
            self.normalized_formula,
        )

    def to_formula_string(self, sheets: Sheets, do_not_simplify_range: bool = False) -> str:
        if self.is_bad_expression:
            return self.normalized_formula
        out = []
        ref_index = number_index = string_index = 0
        for token in self.tokens:
            t = token.type
            if t == "SPACE":
                continue
            if t in ("REFERENCE", "INVALID_REFERENCE"):
                out.append(
                    getters_range_string(
                        self.range_dependencies[ref_index],
                        self.sheet_id,
                        sheets,
                        do_not_simplify_range,
                    )
                )
                ref_index += 1
            elif t == "NUMBER":
                out.append(js_number_to_string(self.numbers[number_index]))
                number_index += 1
            elif t == "STRING":
                out.append(f'"{self.strings[string_index]}"')
                string_index += 1
            else:
                out.append(token.value)
        return "".join(out)


class Compiler:
    def __init__(self, sheets: Sheets, functions: FunctionRegistry):
        self.sheets = sheets
        self.functions = functions
        # normalized formulas known to compile (mirrors the TS `functionCache`)
        self._valid_structures: dict[str, bool] = {}

    def _is_valid_structure(self, tokens: list[Token], cache_key: str) -> bool:
        if cache_key not in self._valid_structures:
            try:
                ast = parse_tokens(tokens)
                if (ast.type == "BIN_OPERATION" and ast.value == ":") or ast.type == "EMPTY":
                    raise BadExpressionError("Invalid formula")
                _check_ast(ast, self.functions)
                self._valid_structures[cache_key] = True
            except (BadExpressionError, RecursionError):
                self._valid_structures[cache_key] = False
        return self._valid_structures[cache_key]

    def compile(self, formula: str, sheet_id: str) -> CompiledFormula:
        """CompiledFormula.Compile. May raise ValueError on out-of-bound references, like the TS."""
        tokens = range_tokenize(formula)
        cache_key = compilation_cache_key(tokens)
        if not self._is_valid_structure(tokens, cache_key):
            return CompiledFormula(
                sheet_id, tokens, [], [], [], [], True, "".join(t.value for t in tokens)
            )
        numbers: list[float] = []
        strings: list[str] = []
        symbols: list[str] = []
        dependencies: list[Range] = []
        for token in tokens:
            t = token.type
            if t in ("REFERENCE", "INVALID_REFERENCE"):
                dependencies.append(get_range_from_sheet_xc(self.sheets, sheet_id, token.value))
            elif t == "STRING":
                strings.append(unquote(token.value))
            elif t == "NUMBER":
                numbers.append(_parse_formula_number(token.value))
            elif t == "SYMBOL":
                symbols.append(unquote(token.value, "'"))
        return CompiledFormula(
            sheet_id, tokens, numbers, strings, symbols, dependencies, False, cache_key
        )


def _parse_formula_number(text: str) -> float:
    # parseNumber(str, DEFAULT_LOCALE): formula number tokens only contain [0-9.eE+-]
    return float(text)
