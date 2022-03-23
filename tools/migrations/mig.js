const functions = ["PIVOT", "PIVOT.UTILS", "SUM"];
const OPERATORS = "+,-,*,/,:,=,<>,>=,>,<=,<,%,^,&".split(",");
const INCORRECT_RANGE_STRING = "#REF";
const formulaNumberRegexp = /^-?\d+(\.?\d*(e\d+)?)?(\s*%)?|^-?\.\d+(\s*%)?/;

function concat(chars) {
  // ~40% faster than chars.join("")
  let output = "";
  for (let i = 0, len = chars.length; i < len; i++) {
    output += chars[i];
  }
  return output;
}

function tokenize(str) {
  const chars = str.split("");
  const result = [];
  let tokenCount = 0;

  while (chars.length) {
    tokenCount++;
    if (tokenCount > 100) {
      throw new Error();
    }
    let token =
      tokenizeSpace(chars) ||
      tokenizeMisc(chars) ||
      tokenizeOperator(chars) ||
      tokenizeString(chars) ||
      tokenizeDebugger(chars) ||
      tokenizeInvalidRange(chars) ||
      tokenizeNumber(chars) ||
      tokenizeSymbol(chars);

    if (!token) {
      token = { type: "UNKNOWN", value: chars.shift() };
    }

    result.push(token);
  }
  return result;
}

function tokenizeDebugger(chars) {
  if (chars[0] === "?") {
    chars.shift();
    return { type: "DEBUGGER", value: "?" };
  }
  return null;
}

const misc = {
  ",": "COMMA",
  "(": "LEFT_PAREN",
  ")": "RIGHT_PAREN",
};

function tokenizeMisc(chars) {
  if (chars[0] in misc) {
    const value = chars.shift();
    const type = misc[value];
    return { type, value };
  }
  return null;
}

function startsWith(chars, op) {
  for (let i = 0; i < op.length; i++) {
    if (op[i] !== chars[i]) {
      return false;
    }
  }
  return true;
}
function tokenizeOperator(chars) {
  for (let op of OPERATORS) {
    if (startsWith(chars, op)) {
      chars.splice(0, op.length);
      return { type: "OPERATOR", value: op };
    }
  }
  return null;
}

function tokenizeNumber(chars) {
  const match = concat(chars).match(formulaNumberRegexp);
  if (match) {
    chars.splice(0, match[0].length);
    return { type: "NUMBER", value: match[0] };
  }
  return null;
}

function tokenizeString(chars) {
  if (chars[0] === '"') {
    const startChar = chars.shift();
    let letters = startChar;
    while (chars[0] && (chars[0] !== startChar || letters[letters.length - 1] === "\\")) {
      letters += chars.shift();
    }
    if (chars[0] === '"') {
      letters += chars.shift();
    }
    return {
      type: "STRING",
      value: letters,
    };
  }
  return null;
}

const separatorRegexp = /\w|\.|!|\$/;

/**
 * A "Symbol" is just basically any word-like element that can appear in a
 * formula, which is not a string. So:
 *   A1
 *   SUM
 *   CEILING.MATH
 *   A$1
 *   Sheet2!A2
 *   'Sheet 2'!A2
 *
 * are examples of symbols
 */
function tokenizeSymbol(chars) {
  // let result = "";
  // // there are two main cases to manage: either something which starts with
  // // a ', like 'Sheet 2'A2, or a word-like element.
  // if (chars[0] === "'") {
  //   let lastChar = chars.shift();
  //   result += lastChar;
  //   while (chars[0]) {
  //     lastChar = chars.shift();
  //     result += lastChar;
  //     if (lastChar === "'") {
  //       if (chars[0] && chars[0] === "'") {
  //         lastChar = chars.shift();
  //         result += lastChar;
  //       } else {
  //         break;
  //       }
  //     }
  //   }

  //   if (lastChar !== "'") {
  //     return {
  //       type: "UNKNOWN",
  //       value: result,
  //     };
  //   }
  // }
  // while (chars[0] && chars[0].match(separatorRegexp)) {
  //   result += chars.shift();
  // }
  // if (result.length) {
  //   const value = result;
  //   const isFunction = value.toUpperCase() in functions;
  //   if (isFunction) {
  //     return { type: "FUNCTION", value };
  //   }
  //   const isReference = value.match(rangeReference);
  //   if (isReference) {
  //     return { type: "REFERENCE", value };
  //   } else {
  //     return { type: "SYMBOL", value };
  //   }
  // }
  return null;
}

const whiteSpaceRegexp = /\s/;

function tokenizeSpace(chars) {
  let length = 0;
  while (chars[0] && chars[0].match(whiteSpaceRegexp)) {
    length++;
    chars.shift();
  }

  if (length) {
    return { type: "SPACE", value: " ".repeat(length) };
  }
  return null;
}

function tokenizeInvalidRange(chars) {
  if (startsWith(chars, INCORRECT_RANGE_STRING)) {
    chars.splice(0, INCORRECT_RANGE_STRING.length);
    return { type: "INVALID_REFERENCE", value: INCORRECT_RANGE_STRING };
  }
  return null;
}

const sentence = '=PIVOT("1","expected_revenue","create_date:month","january")';
console.time("start");
for (let i = 0; i <= 100000; i++) {
  r = tokenize(sentence);
}
console.log(r);
console.timeEnd("start");
