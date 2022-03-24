import re
import unittest

# TOKENIZER --------------------------------------------------------------------

OPERATORS = "+,-,*,/,:,=,<>,>=,>,<=,<,%,^,&".split(",")
UNARY_OPERATORS = ["-", "+"]
ASSOCIATIVE_OPERATORS = ["*", "+", "&"]
FUNCTIONS = [
    "PIVOT",
    "PIVOT.UTILS",
    "SUM",
    "RAND",
    "AND",
    "CEILING.MATH",
    "IF",
    "CONCAT",
]
MISC = {
    ",": "COMMA",
    "(": "LEFT_PAREN",
    ")": "RIGHT_PAREN",
}
INCORRECT_RANGE_STRING = "#REF"

NUMBER_REGEX = re.compile(r"^-?\d+(\.?\d*(e\d+)?)?(\s*%)?|^-?\.\d+(\s*%)?")
STRING_REGEX = re.compile(r'"(.+?)(?<!\\)"')
SEPARATOR_REGEX = re.compile(r"\w|\.|!|\$")
RANGE_REGEX = re.compile(
    r"^\s*('.+'!|[^']+!)?\$?[A-Z]{1,3}\$?[0-9]{1,7}(\s*:\s*\$?[A-Z]{1,3}\$?[0-9]{1,7})?", re.IGNORECASE)


def tokenize(sentence):
    tokens = []
    while len(sentence):
        result = \
            tokenizeSpace(sentence) or \
            tokenizeMisc(sentence) or \
            tokenizeOperator(sentence) or \
            tokenizeString(sentence) or \
            tokenizeDebugger(sentence) or \
            tokenizeInvalidRange(sentence) or \
            tokenizeNumber(sentence) or \
            tokenizeSymbol(sentence) or \
            tokenizeUnknown(sentence)
        sentence = result["sentence"]
        tokens.append(result["token"])
    return tokens


def tokenizeSpace(sentence):
    if sentence[0] != " ":
        return False
    length = len(sentence) - len(sentence.lstrip())
    return {"sentence": sentence[length:], "token": {"type": "SPACE", "value": " " * length}}


def tokenizeMisc(sentence):
    if sentence[0] in MISC:
        value = sentence[0]
        return {"sentence": sentence[1:], "token": {"type": MISC[value], "value": value}}
    return False


def tokenizeOperator(sentence):
    if sentence[0] not in [op[0] for op in OPERATORS]:
        return False
    for op in OPERATORS:
        if sentence.startswith(op):
            return {"sentence": sentence[len(op):], "token": {"type": "OPERATOR", "value": op}}
    return False


def tokenizeString(sentence):
    if sentence[0] == '"':
        match = STRING_REGEX.findall(sentence)[0]
        return {"sentence": sentence[len(match)+2:], "token": {"type": "STRING", "value": '"' + match + '"'}}

    return False


def tokenizeDebugger(sentence):
    if sentence[0] == "?":
        return {"sentence": sentence[1:], "token": {"type": "DEBUGGER", "value": "?"}}
    return False


def tokenizeInvalidRange(sentence):
    if sentence.startswith(INCORRECT_RANGE_STRING):
        return {"sentence": sentence[len(INCORRECT_RANGE_STRING):], "token": {"type": "INVALID_REFERENCE", "value": INCORRECT_RANGE_STRING}}
    return False


def tokenizeNumber(sentence):
    if sentence[0] == "-" or sentence[0].isdigit() or sentence[0] == ".":
        matches = NUMBER_REGEX.match(sentence)
        if matches:
            return {"sentence": sentence[len(matches[0]):], "token": {"type": "NUMBER", "value": matches[0]}}
    return False


def tokenizeSymbol(sentence):
    result = ""
    if sentence[0] == "'":
        result = sentence[0]
        sentence = sentence[1:]
        while sentence:
            result += sentence[0]
            sentence = sentence[1:]
            if result[-1] == "'":
                if sentence and sentence[0] == "'":
                    result += sentence[0]
                    sentence = sentence[1:]
                else:
                    break
        if result[-1] != "'":
            return {"sentence": sentence, "token": {"type": "UNKNOWN", "value": result}}
    while sentence and SEPARATOR_REGEX.match(sentence[0]):
        result += sentence[0]
        sentence = sentence[1:]
    if result:
        if result.upper() in FUNCTIONS:
            return {"sentence": sentence, "token": {"type": "FUNCTION", "value": result}}
        if RANGE_REGEX.match(result):
            return {"sentence": sentence, "token": {"type": "REFERENCE", "value": result}}
        return {"sentence": sentence, "token": {"type": "SYMBOL", "value": result}}
    return False


def tokenizeUnknown(sentence):
    value = sentence[0]
    return {"sentence": sentence[1:], "token": {"type": "UNKNOWN", "value": value}}

# TOKENIZER TESTS --------------------------------------------------------------


class TestCase(unittest.TestCase):
    def test_simple_token(self):
        self.assertEqual(tokenize("1"), [{"type": "NUMBER", "value": "1"}])

    def test_number_with_decimal_token(self):
        self.assertEqual(tokenize("=1.5"), [
            {"type": "OPERATOR", "value": "="},
            {"type": "NUMBER", "value": "1.5"},
        ])

    def test_formula_token(self):
        self.assertEqual(tokenize("=1"), [
            {"type": "OPERATOR", "value": "="},
            {"type": "NUMBER", "value": "1"},
        ])

    def test_longer_operators(self):
        self.assertEqual(tokenize("= >= <= <"), [
            {"type": "OPERATOR", "value": "="},
            {"type": "SPACE", "value": " "},
            {"type": "OPERATOR", "value": ">="},
            {"type": "SPACE", "value": " "},
            {"type": "OPERATOR", "value": "<="},
            {"type": "SPACE", "value": " "},
            {"type": "OPERATOR", "value": "<"},
        ])

    def test_concat_operator(self):
        self.assertEqual(tokenize("=&"), [
            {"type": "OPERATOR", "value": "="},
            {"type": "OPERATOR", "value": "&"},
        ])

    def test_not_equal_operator(self):
        self.assertEqual(tokenize("=<>"), [
            {"type": "OPERATOR", "value": "="},
            {"type": "OPERATOR", "value": "<>"},
        ])

    def test_can_tokenize_various_number_expressions(self):
        self.assertEqual(tokenize("1%"),
                         [{"type": "NUMBER", "value": "1%"}])
        self.assertEqual(tokenize("1 %"),
                         [{"type": "NUMBER", "value": "1 %"}])
        self.assertEqual(tokenize("1.1"),
                         [{"type": "NUMBER", "value": "1.1"}])
        self.assertEqual(tokenize("1e3"),
                         [{"type": "NUMBER", "value": "1e3"}])

    def test_debug_formula_token(self):
        self.assertEqual(tokenize("=?1"), [
            {"type": "OPERATOR", "value": "="},
            {"type": "DEBUGGER", "value": "?"},
            {"type": "NUMBER", "value": "1"},
        ])

    def test_REF_formula_token(self):
        self.assertEqual(tokenize("#REF"),
                         [{"type": "INVALID_REFERENCE", "value": "#REF"}])
        self.assertEqual(tokenize("=#REF+1"), [
            {"type": "OPERATOR", "value": "="},
            {"type": "INVALID_REFERENCE", "value": "#REF"},
            {"type": "OPERATOR", "value": "+"},
            {"type": "NUMBER", "value": "1"},
        ])

    def test_string(self):
        self.assertEqual(tokenize('"hello"'),
                         [{"type": "STRING", "value": '"hello"'}])
        self.assertEqual(tokenize("'hello'"),
                         [{"type": "SYMBOL", "value": "'hello'"}])
        self.assertEqual(tokenize("'hello"),
                         [{"type": "UNKNOWN", "value": "'hello"}])
        self.assertEqual(tokenize('"he\\"l\\"lo"'),
                         [{"type": "STRING", "value": '"he\\"l\\"lo"'}])
        self.assertEqual(tokenize("\"hel'l'o\""),
                         [{"type": "STRING", "value": "\"hel'l'o\""}])
        self.assertEqual(tokenize('"hello""test"'), [
            {"type": "STRING", "value": '"hello"'},
            {"type": "STRING", "value": '"test"'},
        ])

    def test_function_token(self):
        self.assertEqual(tokenize("SUM"),
                         [{"type": "FUNCTION", "value": "SUM"}])
        self.assertEqual(tokenize("RAND"),
                         [{"type": "FUNCTION", "value": "RAND"}])
        self.assertEqual(tokenize("rand"),
                         [{"type": "FUNCTION", "value": "rand"}])

    def test_function_token_with_point(self):
        self.assertEqual(tokenize("CEILING.MATH"),
                         [{"type": "FUNCTION", "value": "CEILING.MATH"}])
        self.assertEqual(tokenize("ceiling.math"),
                         [{"type": "FUNCTION", "value": "ceiling.math"}])

    def test_boolean(self):
        self.assertEqual(tokenize("true"),
                         [{"type": "SYMBOL", "value": "true"}])
        self.assertEqual(tokenize("false"), [
            {
                "type": "SYMBOL",
                "value": "false",
            },
        ])
        self.assertEqual(tokenize("TRUE"),
                         [{"type": "SYMBOL", "value": "TRUE"}])
        self.assertEqual(tokenize("FALSE"), [
            {
                "type": "SYMBOL",
                "value": "FALSE",
            },
        ])
        self.assertEqual(tokenize("TrUe"),
                         [{"type": "SYMBOL", "value": "TrUe"}])
        self.assertEqual(tokenize("FalSe"), [
            {
                "type": "SYMBOL",
                "value": "FalSe",
            },
        ])
        self.assertEqual(tokenize("=AND(true,false)"), [
            {"type": "OPERATOR", "value": "="},
            {"type": "FUNCTION", "value": "AND"},
            {"type": "LEFT_PAREN", "value": "("},
            {"type": "SYMBOL", "value": "true"},
            {"type": "COMMA", "value": ","},
            {"type": "SYMBOL", "value": "false"},
            {"type": "RIGHT_PAREN", "value": ")"},
        ])
        self.assertEqual(tokenize("=trueee"), [
            {"type": "OPERATOR", "value": "="},
            {"type": "SYMBOL", "value": "trueee"},
        ])

    def test_references(self):
        self.assertEqual(tokenize("=A1"), [
            {"type": "OPERATOR", "value": "="},
            {"type": "REFERENCE", "value": "A1"},
        ])
        self.assertEqual(tokenize("= A1 "), [
            {"type": "OPERATOR", "value": "="},
            {"type": "SPACE", "value": " "},
            {"type": "REFERENCE", "value": "A1"},
            {"type": "SPACE", "value": " "},
        ])

    def test_fixed_references(self):
        self.assertEqual(tokenize("=$A$1"), [
            {"type": "OPERATOR", "value": "="},
            {"type": "REFERENCE", "value": "$A$1"},
        ])
        self.assertEqual(tokenize("=C$1"), [
            {"type": "OPERATOR", "value": "="},
            {"type": "REFERENCE", "value": "C$1"},
        ])
        self.assertEqual(tokenize("=$C1"), [
            {"type": "OPERATOR", "value": "="},
            {"type": "REFERENCE", "value": "$C1"},
        ])

    def test_reference_and_sheets(self):
        self.assertEqual(tokenize("=Sheet1!A1"), [
            {"type": "OPERATOR", "value": "="},
            {"type": "REFERENCE", "value": "Sheet1!A1"},
        ])
        self.assertEqual(tokenize("='Sheet1'!A1"), [
            {"type": "OPERATOR", "value": "="},
            {"type": "REFERENCE", "value": "'Sheet1'!A1"},
        ])
        self.assertEqual(tokenize("='Aryl Nibor Xela Nalim'!A1"), [
            {"type": "OPERATOR", "value": "="},
            {"type": "REFERENCE", "value": "'Aryl Nibor Xela Nalim'!A1"},
        ])
        self.assertEqual(tokenize("=Sheet1!$A1"), [
            {"type": "OPERATOR", "value": "="},
            {"type": "REFERENCE", "value": "Sheet1!$A1"},
        ])
        self.assertEqual(tokenize("=Sheet1!A$1"), [
            {"type": "OPERATOR", "value": "="},
            {"type": "REFERENCE", "value": "Sheet1!A$1"},
        ])
        self.assertEqual(tokenize("='a '' b'!A1"), [
            {"type": "OPERATOR", "value": "="},
            {"type": "REFERENCE", "value": "'a '' b'!A1"},
        ])

    def test_wrong_references(self):
        self.assertEqual(tokenize("='Sheet1!A1"), [
            {"type": "OPERATOR", "value": "="},
            {"type": "UNKNOWN", "value": "'Sheet1!A1"},
        ])
        self.assertEqual(tokenize("=!A1"), [
            {"type": "OPERATOR", "value": "="},
            {"type": "SYMBOL", "value": "!A1"},
        ])
        self.assertEqual(tokenize("=''!A1"), [
            {"type": "OPERATOR", "value": "="},
            {"type": "SYMBOL", "value": "''!A1"},
        ])

    # js regex does not catch `ù` with the separator regex
    # def test_unknown_characters(self):
    #     self.assertEqual(tokenize("=ù4"), [
    #         {"type": "OPERATOR", "value": "="},
    #         {"type": "UNKNOWN", "value": "ù"},
    #         {"type": "NUMBER", "value": "4"},
    #     ])

# PARSER -----------------------------------------------------------------------


OP_PRIORITY = {
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

FUNCTION_BP = 6


def bindingPower(token):
    token_type = token["type"]
    if token_type == "NUMBER" or token_type == "SYMBOL" or token_type == "REFERENCE":
        return 0
    if token_type == "COMMA":
        return 3
    if token_type == "LEFT_PAREN" or token_type == "RIGHT_PAREN":
        return 5
    if token_type == "OPERATOR":
        return OP_PRIORITY[token["value"]] or 15
    raise Exception("Unknown token")


def parse(sentence):
    return parseTokens(tokenize(sentence))


def parseTokens(tokens):
    tokens = [token for token in tokens if token["type"] != "SPACE"]
    if tokens[0]["type"] == "OPERATOR" and tokens[0]["value"] == "=":
        tokens.pop(0)
    result = parseExpression(tokens, 0)
    if tokens:
        raise Exception("Invalid expression")
    return result


def parseExpression(tokens, bp):
    try:
        token = tokens.pop(0)
    except:
        raise Exception("Invalid expression")
    expr = parsePrefix(token, tokens)
    while tokens and bindingPower(tokens[0]) > bp:
        expr = parseInfix(expr, tokens.pop(0), tokens)
    return expr


def parseInfix(left, current, tokens):
    if current["type"] != "OPERATOR":
        raise Exception("Invalid expression")
    bp = bindingPower(current)
    right = parseExpression(tokens, bp)
    return {
        "type": "BIN_OPERATION",
        "value": current["value"],
        "left": left,
        "right": right,
    }


def parsePrefix(current, tokens):
    if current["type"] == "DEBUGGER":
        next = parseExpression(tokens, 1000)
        next["debug"] = True
        return next
    if current["type"] == "NUMBER":
        return {"type": "NUMBER", "value": parseNumber(current["value"])}
    if current["type"] == "STRING":
        return {"type": "STRING", "value": removeStringQuotes(current["value"])}
    if current["type"] == "FUNCTION":
        if tokens.pop(0)["type"] != "LEFT_PAREN":
            raise Exception("Wrong function call")
        args = []
        if tokens[0]["type"] != "RIGHT_PAREN":
            if tokens[0]["type"] == "COMMA":
                args.append({"type": "UNKNOWN", "value": ""})
            else:
                args.append(parseExpression(tokens, FUNCTION_BP))
            while (tokens[0]["type"] == "COMMA"):
                tokens.pop(0)
                if tokens[0]["type"] == "RIGHT_PAREN":
                    args.append({"type": "UNKNOWN", "value": ""})
                    break
                if tokens[0]["type"] == "COMMA":
                    args.append({"type": "UNKNOWN", "value": ""})
                else:
                    args.append(parseExpression(tokens, FUNCTION_BP))
        if tokens.pop(0)["type"] != "RIGHT_PAREN":
            raise Exception("Wrong function call")
        return {"type": "FUNCALL", "value": current["value"], "args": args}
    if current["type"] == "INVALID_REFERENCE":
        raise Exception("Invalid reference")
    if current["type"] == "REFERENCE":
        if len(tokens) >= 2 and tokens[0]["value"] == ":" and tokens[1]["type"] == "REFERENCE":
            tokens.pop(0)
            right = tokens.pop(0)
            return {"type": "REFERENCE", "value": f"{current['value']}:{right['value']}"}
        return {"type": "REFERENCE", "value": current["value"]}
    if current["type"] == "SYMBOL":
        if current["value"].upper() in ["TRUE", "FALSE"]:
            return {"type": "BOOLEAN", "value": current["value"].upper() == "TRUE"}
        if current["value"]:
            raise Exception("Invalid formula")
        return {"type": "STRING", "value": current["value"]}
    if current["type"] == "LEFT_PAREN":
        result = parseExpression(tokens, 5)
        if not tokens or tokens[0]["type"] != "RIGHT_PAREN":
            raise Exception("Unmatched left parenthesis")
        tokens.pop(0)
        return result
    if current["type"] == "OPERATOR" and current["value"] in UNARY_OPERATORS:
        return {"type": "UNARY_OPERATION", "value": current["value"], "right": parseExpression(tokens, OP_PRIORITY[current["value"]])}
    raise Exception(f"Unexpected token: {current['value']}")


def removeStringQuotes(value):
    if value[0] == '"' and value[-1] == '"':
        return value[1:-1]
    return value


def parseNumber(value):
    try:
        return int(value)
    except:
        try:
            return float(value)
        except:
            try:
                return float(value.split("%")[0]) / 100
            except:
                return None


def astToFormula(ast):
    ast_type = ast["type"]
    if ast_type == "FUNCALL":
        args = map(lambda arg: astToFormula(arg), ast["args"])
        return f"{ast['value']}({','.join(args)})"
    if ast_type == "NUMBER":
        return str(ast["value"])
    if ast_type == "REFERENCE":
        return ast["value"]
    if ast_type == "STRING":
        return f"\"{ast['value']}\""
    if ast_type == "BOOLEAN":
        return "TRUE" if ast["value"] else "FALSE"
    if ast_type == "UNARY_OPERATION":
        return ast["value"] + rightOperandToFormula(ast)
    if ast_type == "BIN_OPERATION":
        return leftOperandToFormula(ast) + ast["value"] + rightOperandToFormula(ast)
    return ast["value"]


def leftOperandToFormula(ast):
    mainOperator = ast["value"]
    leftOperation = ast["left"]
    leftOperator = leftOperation["value"]
    needParenthesis = True if leftOperation["type"] == "BIN_OPERATION" and OP_PRIORITY[
        leftOperator] < OP_PRIORITY[mainOperator] else False
    return f"({astToFormula(leftOperation)})" if needParenthesis else astToFormula(leftOperation)


def rightOperandToFormula(ast):
    mainOperator = ast["value"]
    rightOperation = ast["right"]
    rightPriority = OP_PRIORITY.get(rightOperation["value"])
    mainPriority = OP_PRIORITY.get(mainOperator)
    needParenthesis = False
    if rightOperation["type"] != "BIN_OPERATION":
        needParenthesis = False
    elif rightPriority < mainPriority:
        needParenthesis = True
    elif rightPriority == mainPriority and not mainOperator in ASSOCIATIVE_OPERATORS:
        needParenthesis = True
    return f"({astToFormula(rightOperation)})" if needParenthesis else astToFormula(rightOperation)

# PARSER TESTS -----------------------------------------------------------------


class ParserTests(unittest.TestCase):

    def test_can_parse_a_function_call_with_no_argument(self):
        self.assertEqual(parse("RAND()"), {
            "type": "FUNCALL", "value": "RAND", "args": []})

    def test_can_parse_a_function_call_with_one_argument(self):
        self.assertEqual(parse("SUM(1)"), {
            "type": "FUNCALL",
            "value": "SUM",
            "args": [{"type": "NUMBER", "value": 1}],
        })

    def test_can_parse_a_function_call_with_sub_expressions_as_argument(self):
        self.assertEqual(parse("IF(A1 > 0, 1, 2)"), {
            "type": "FUNCALL",
            "value": "IF",
            "args": [
                {
                    "type": "BIN_OPERATION",
                    "value": ">",
                    "left": {"type": "REFERENCE", "value": "A1"},
                    "right": {"type": "NUMBER", "value": 0},
                },
                {"type": "NUMBER", "value": 1},
                {"type": "NUMBER", "value": 2},
            ]
        })

    def test_add_a_unknown_token_for_empty_arguments(self):
        self.assertEqual(parse("SUM(1,)"), {
            "type": "FUNCALL",
            "value": "SUM",
            "args": [
                {"type": "NUMBER", "value": 1},
                {"type": "UNKNOWN", "value": ""},
            ],
        })

        self.assertEqual(parse("SUM(,1)"), {
            "type": "FUNCALL",
            "value": "SUM",
            "args": [
                {"type": "UNKNOWN", "value": ""},
                {"type": "NUMBER", "value": 1},
            ],
        })

        self.assertEqual(parse("SUM(,)"), {
            "type": "FUNCALL",
            "value": "SUM",
            "args": [
                {"type": "UNKNOWN", "value": ""},
                {"type": "UNKNOWN", "value": ""},
            ],
        })

        self.assertEqual(parse("SUM(,,)"), {
            "type": "FUNCALL",
            "value": "SUM",
            "args": [
                {"type": "UNKNOWN", "value": ""},
                {"type": "UNKNOWN", "value": ""},
                {"type": "UNKNOWN", "value": ""},
            ],
        })

        self.assertEqual(parse("SUM(,,,1)"), {
            "type": "FUNCALL",
            "value": "SUM",
            "args": [
                {"type": "UNKNOWN", "value": ""},
                {"type": "UNKNOWN", "value": ""},
                {"type": "UNKNOWN", "value": ""},
                {"type": "NUMBER", "value": 1},
            ],
        })

    def test_can_parse_unary_operations(self):
        self.assertEqual(parse("-1"), {
            "type": "UNARY_OPERATION",
            "value": "-",
            "right": {"type": "NUMBER", "value": 1},
        })
        self.assertEqual(parse("+1"), {
            "type": "UNARY_OPERATION",
            "value": "+",
            "right": {"type": "NUMBER", "value": 1},
        })

    def test_can_parse_numeric_values(self):
        self.assertEqual(parse("1"), {"type": "NUMBER", "value": 1})
        self.assertEqual(parse("1.5"), {"type": "NUMBER", "value": 1.5})
        self.assertEqual(parse("1."), {"type": "NUMBER", "value": 1})
        self.assertEqual(parse(".5"), {"type": "NUMBER", "value": 0.5})

    def test_can_parse_number_expressed_as_percent(self):
        self.assertEqual(parse("1%"), {"type": "NUMBER", "value": 0.01})
        self.assertEqual(parse("100%"), {"type": "NUMBER", "value": 1})
        self.assertEqual(parse("50.0%"), {"type": "NUMBER", "value": 0.5})

    def test_can_parse_binary_operations(self):
        self.assertEqual(parse("2-3"), {
            "type": "BIN_OPERATION",
            "value": "-",
            "left": {"type": "NUMBER", "value": 2},
            "right": {"type": "NUMBER", "value": 3},
        })

    def test_can_parse_concat_operator(self):
        self.assertEqual(parse("A1&A2"), {
            "type": "BIN_OPERATION",
            "value": "&",
            "left": {"type": "REFERENCE", "value": "A1"},
            "right": {"type": "REFERENCE", "value": "A2"},
        })

    def test_AND(self):
        self.assertEqual(parse("=AND(true, false)"), {
            "type": "FUNCALL",
            "value": "AND",
            "args": [
                {"type": "BOOLEAN", "value": True},
                {"type": "BOOLEAN", "value": False},
            ],
        })
        self.assertEqual(parse("=AND(0, tRuE)"), {
            "type": "FUNCALL",
            "value": "AND",
            "args": [
                {"type": "NUMBER", "value": 0},
                {"type": "BOOLEAN", "value": True},
            ],
        })

    def test_convert_number(self):
        self.assertEqual(astToFormula(parse("1")), "1")

    def test_convert_string(self):
        self.assertEqual(astToFormula(parse('"hello"')), '"hello"')

    def test_convert_boolean(self):
        self.assertEqual(astToFormula(parse("TRUE")), "TRUE")
        self.assertEqual(astToFormula(parse("FALSE")), "FALSE")

    def test_convert_unary_operator(self):
        self.assertEqual(astToFormula(parse("-45")), "-45")
        self.assertEqual(astToFormula(parse("+45")), "+45")
        self.assertEqual(astToFormula(parse("-(4+5)")), "-(4+5)")
        self.assertEqual(astToFormula(parse("-4+5")), "-4+5")
        self.assertEqual(astToFormula(parse("-SUM(1)")), "-SUM(1)")
        self.assertEqual(astToFormula(parse("-(1+2)/5")), "-(1+2)/5")
        self.assertEqual(astToFormula(parse("1*-(1+2)")), "1*-(1+2)")

    def test_convert_binary_operator(self):
        self.assertEqual(astToFormula(parse("89-45")), "89-45")
        self.assertEqual(astToFormula(parse("1+2+5")), "1+2+5")
        self.assertEqual(astToFormula(parse("(1+2)/5")), "(1+2)/5")
        self.assertEqual(astToFormula(parse("5/(1+2)")), "5/(1+2)")
        self.assertEqual(astToFormula(parse("2/(1*2)")), "2/(1*2)")
        self.assertEqual(astToFormula(parse("1-2+3")), "1-2+3")
        self.assertEqual(astToFormula(parse("1-(2+3)")), "1-(2+3)")
        self.assertEqual(astToFormula(parse("(1+2)-3")), "1+2-3")
        self.assertEqual(astToFormula(parse("(1<5)+5")), "(1<5)+5")
        self.assertEqual(astToFormula(parse("1*(4*2+3)")), "1*(4*2+3)")
        self.assertEqual(astToFormula(parse("1*(4+2*3)")), "1*(4+2*3)")
        self.assertEqual(astToFormula(parse("1*(4*2+3*9)")), "1*(4*2+3*9)")
        self.assertEqual(astToFormula(parse("1*(4-(2+3))")), "1*(4-(2+3))")
        self.assertEqual(astToFormula(parse("1/(2*(2+3))")), "1/(2*(2+3))")
        self.assertEqual(astToFormula(parse("1/((2+3)*2)")), "1/((2+3)*2)")
        self.assertEqual(astToFormula(parse("2<(1<1)")), "2<(1<1)")
        self.assertEqual(astToFormula(parse("2<=(1<1)")), "2<=(1<1)")
        self.assertEqual(astToFormula(parse("2>(1<1)")), "2>(1<1)")
        self.assertEqual(astToFormula(parse("2>=(1<1)")), "2>=(1<1)")
        self.assertEqual(astToFormula(parse("TRUE=1=1")), "TRUE=1=1")
        self.assertEqual(astToFormula(parse("TRUE=(1=1)")), "TRUE=(1=1)")

    def test_convert_function(self):
        self.assertEqual(astToFormula(parse("SUM(5,9,8)")), "SUM(5,9,8)")
        self.assertEqual(astToFormula(
            parse("-SUM(5,9,SUM(5,9,8))")), "-SUM(5,9,SUM(5,9,8))")

    def test_convert_references(self):
        self.assertEqual(astToFormula(parse("A10")), "A10")
        self.assertEqual(astToFormula(parse("Sheet1!A10")), "Sheet1!A10")
        self.assertEqual(astToFormula(
            parse("'Sheet 1'!A10")), "'Sheet 1'!A10")
        self.assertEqual(astToFormula(
            parse("'Sheet 1'!A10:A11")), "'Sheet 1'!A10:A11")
        self.assertEqual(astToFormula(parse("SUM(A1,A2)")), "SUM(A1,A2)")

    def test_convert_strings(self):
        self.assertEqual(astToFormula(parse('"R"')), '"R"')
        self.assertEqual(astToFormula(
            parse('CONCAT("R", "EM")')), 'CONCAT("R","EM")')

    def test_convert_numbers(self):
        self.assertEqual(astToFormula(parse("5")), "5")
        self.assertEqual(astToFormula(parse("5+4")), "5+4")
        self.assertEqual(astToFormula(parse("+5")), "+5")


if __name__ == "__main__":
    unittest.main()
