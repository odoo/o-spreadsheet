import math
import re
import time

from soupsieve import match


OPERATORS = "+,-,*,/,:,=,<>,>=,>,<=,<,%,^,&".split(",")
FUNCTIONS = [
    "PIVOT",
    "PIVOT.UTILS",
    "SUM",
]
MISC = {
    ",": "COMMA",
    "(": "LEFT_PAREN",
    ")": "RIGHT_PAREN",
}
INCORRECT_RANGE_STRING = "#REF"


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
    for op in OPERATORS:
        if sentence.startswith(op):
            return {"sentence": sentence[len(op):], "token": {"type": "OPERATOR", "value": op}}
    return False


def tokenizeString(sentence):
    if sentence[0] == '"':
        match = re.findall(r'"(.+?)"', sentence)[0]
        return {"sentence": sentence[len(match)+2:], "token": {"type": "STRING", "value": match}}

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
    if sentence[0] != "-" or not sentence[0].isdigit():
        return False
    matches = re.findall(
        r'/^-?\d+(\.?\d*(e\d+)?)?(\s*%)?|^-?\.\d+(\s*%)?/', sentence)
    if matches:
        return {"sentence": sentence[len(matches[0]):], "token": {"type": "NUMBER", "value": matches[0]}}
    return False


def tokenizeSymbol(sentence):
    return False


def tokenizeUnknown(sentence):
    value = sentence[0]
    return {"sentence": sentence[1:], "token": {"type": "unknown", "value": value}}


if __name__ == "__main__":
    sentence = '=PIVOT("1","expected_revenue","create_date:month","january")'
    # sentence = "=(),"
    start_time = time.time()
    # print([token for token in tokenize(sentence)
    #       if token["type"] != "unknown"])
    for i in range(100000):
        r = tokenize(sentence)
    print(r)
    print("--- %s seconds ---" % (time.time() - start_time))
