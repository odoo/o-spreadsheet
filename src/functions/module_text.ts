import { escapeRegExp, formatValue } from "../helpers";
import { _lt } from "../translation";
import { AddFunctionDescription, ArgValue, PrimitiveArgValue } from "../types";
import { arg } from "./arguments";
import { assert, reduceAny, toBoolean, toNumber, toString } from "./helpers";

const DEFAULT_STARTING_AT = 1;

/** Regex matching all the words in a string */
const wordRegex = /[A-Za-zÀ-ÖØ-öø-ÿ]+/g;

// -----------------------------------------------------------------------------
// CHAR
// -----------------------------------------------------------------------------
export const CHAR: AddFunctionDescription = {
  description: _lt("Gets character associated with number."),
  args: [
    arg(
      "table_number (number)",
      _lt(
        "The number of the character to look up from the current Unicode table in decimal format."
      )
    ),
  ],
  returns: ["STRING"],
  compute: function (tableNumber: PrimitiveArgValue): string {
    const _tableNumber = Math.trunc(toNumber(tableNumber));
    assert(
      () => _tableNumber >= 1,
      _lt("The table_number (%s) is out of range.", _tableNumber.toString())
    );
    return String.fromCharCode(_tableNumber);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// CLEAN
// -----------------------------------------------------------------------------
export const CLEAN: AddFunctionDescription = {
  description: _lt("Remove non-printable characters from a piece of text."),
  args: [arg("text (string)", _lt("The text whose non-printable characters are to be removed."))],
  returns: ["STRING"],
  compute: function (text: PrimitiveArgValue): string {
    const _text = toString(text);
    let cleanedStr = "";
    for (const char of _text) {
      if (char && char.charCodeAt(0) > 31) {
        cleanedStr += char;
      }
    }
    return cleanedStr;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// CONCATENATE
// -----------------------------------------------------------------------------
export const CONCATENATE: AddFunctionDescription = {
  description: _lt("Appends strings to one another."),
  args: [
    arg("string1 (string, range<string>)", _lt("The initial string.")),
    arg("string2 (string, range<string>, repeating)", _lt("More strings to append in sequence.")),
  ],
  returns: ["STRING"],
  compute: function (...values: ArgValue[]): string {
    return reduceAny(values, (acc, a) => acc + toString(a), "");
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// EXACT
// -----------------------------------------------------------------------------
export const EXACT: AddFunctionDescription = {
  description: _lt("Tests whether two strings are identical."),
  args: [
    arg("string1 (string)", _lt("The first string to compare.")),
    arg("string2 (string)", _lt("The second string to compare.")),
  ],
  returns: ["BOOLEAN"],
  compute: function (string1: PrimitiveArgValue, string2: PrimitiveArgValue): boolean {
    return toString(string1) === toString(string2);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// FIND
// -----------------------------------------------------------------------------
export const FIND: AddFunctionDescription = {
  description: _lt("First position of string found in text, case-sensitive."),
  args: [
    arg("search_for (string)", _lt("The string to look for within text_to_search.")),
    arg(
      "text_to_search (string)",
      _lt("The text to search for the first occurrence of search_for.")
    ),
    arg(
      `starting_at (number, default=${DEFAULT_STARTING_AT})`,
      _lt("The character within text_to_search at which to start the search.")
    ),
  ],
  returns: ["NUMBER"],
  compute: function (
    searchFor: PrimitiveArgValue,
    textToSearch: PrimitiveArgValue,
    startingAt: PrimitiveArgValue = DEFAULT_STARTING_AT
  ): number {
    const _searchFor = toString(searchFor);
    const _textToSearch = toString(textToSearch);
    const _startingAt = toNumber(startingAt);

    assert(() => _textToSearch !== "", _lt(`The text_to_search must be non-empty.`));
    assert(
      () => _startingAt >= 1,
      _lt("The starting_at (%s) must be greater than or equal to 1.", _startingAt.toString())
    );

    const result = _textToSearch.indexOf(_searchFor, _startingAt - 1);

    assert(
      () => result >= 0,
      _lt(
        "In [[FUNCTION_NAME]] evaluation, cannot find '%s' within '%s'.",
        _searchFor.toString(),
        _textToSearch
      )
    );

    return result + 1;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// JOIN
// -----------------------------------------------------------------------------
export const JOIN: AddFunctionDescription = {
  description: _lt("Concatenates elements of arrays with delimiter."),
  args: [
    arg(
      "delimiter (string)",
      _lt("The character or string to place between each concatenated value.")
    ),
    arg(
      "value_or_array1 (string, range<string>)",
      _lt("The value or values to be appended using delimiter.")
    ),
    arg(
      "value_or_array2 (string, range<string>, repeating)",
      _lt("More values to be appended using delimiter.")
    ),
  ],
  returns: ["STRING"],
  compute: function (delimiter: PrimitiveArgValue, ...valuesOrArrays: ArgValue[]): string {
    const _delimiter = toString(delimiter);
    return reduceAny(valuesOrArrays, (acc, a) => (acc ? acc + _delimiter : "") + toString(a), "");
  },
};

// -----------------------------------------------------------------------------
// LEFT
// -----------------------------------------------------------------------------
export const LEFT: AddFunctionDescription = {
  description: _lt("Substring from beginning of specified string."),
  args: [
    arg("text (string)", _lt("The string from which the left portion will be returned.")),
    arg(
      "number_of_characters (number, optional)",
      _lt("The number of characters to return from the left side of string.")
    ),
  ],
  returns: ["STRING"],
  compute: function (text: PrimitiveArgValue, ...args: PrimitiveArgValue[]): string {
    const _numberOfCharacters = args.length ? toNumber(args[0]) : 1;
    assert(
      () => _numberOfCharacters >= 0,
      _lt("The number_of_characters (%s) must be positive or null.", _numberOfCharacters.toString())
    );
    return toString(text).substring(0, _numberOfCharacters);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// LEN
// -----------------------------------------------------------------------------
export const LEN: AddFunctionDescription = {
  description: _lt("Length of a string."),
  args: [arg("text (string)", _lt("The string whose length will be returned."))],
  returns: ["NUMBER"],
  compute: function (text: PrimitiveArgValue): number {
    return toString(text).length;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// LOWER
// -----------------------------------------------------------------------------
export const LOWER: AddFunctionDescription = {
  description: _lt("Converts a specified string to lowercase."),
  args: [arg("text (string)", _lt("The string to convert to lowercase."))],
  returns: ["STRING"],
  compute: function (text: PrimitiveArgValue): string {
    return toString(text).toLowerCase();
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// MID
// -----------------------------------------------------------------------------
export const MID: AddFunctionDescription = {
  description: _lt("A segment of a string."),
  args: [
    arg("text (string)", _lt("The string to extract a segment from.")),
    arg(
      "starting_at (number)",
      _lt(
        "The index from the left of string from which to begin extracting. The first character in string has the index 1."
      )
    ),
    arg("extract_length (number)", _lt("The length of the segment to extract.")),
  ],
  returns: ["STRING"],
  compute: function (
    text: PrimitiveArgValue,
    starting_at: PrimitiveArgValue,
    extract_length: PrimitiveArgValue
  ): string {
    const _text = toString(text);
    const _starting_at = toNumber(starting_at);
    const _extract_length = toNumber(extract_length);

    assert(
      () => _starting_at >= 1,
      _lt(
        "The starting_at argument (%s) must be positive greater than one.",
        _starting_at.toString()
      )
    );
    assert(
      () => _extract_length >= 0,
      _lt("The extract_length argument (%s) must be positive or null.", _extract_length.toString())
    );

    return _text.slice(_starting_at - 1, _starting_at + _extract_length - 1);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// PROPER
// -----------------------------------------------------------------------------
export const PROPER: AddFunctionDescription = {
  description: _lt("Capitalizes each word in a specified string."),
  args: [
    arg(
      "text_to_capitalize (string)",
      _lt(
        "The text which will be returned with the first letter of each word in uppercase and all other letters in lowercase."
      )
    ),
  ],
  returns: ["STRING"],
  compute: function (text: PrimitiveArgValue): string {
    const _text = toString(text);
    return _text.replace(wordRegex, (word): string => {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// REPLACE
// -----------------------------------------------------------------------------
export const REPLACE: AddFunctionDescription = {
  description: _lt("Replaces part of a text string with different text."),
  args: [
    arg("text (string)", _lt("The text, a part of which will be replaced.")),
    arg(
      "position (number)",
      _lt("The position where the replacement will begin (starting from 1).")
    ),
    arg("length (number)", _lt("The number of characters in the text to be replaced.")),
    arg("new_text (string)", _lt("The text which will be inserted into the original text.")),
  ],
  returns: ["STRING"],
  compute: function (
    text: PrimitiveArgValue,
    position: PrimitiveArgValue,
    length: PrimitiveArgValue,
    newText: PrimitiveArgValue
  ): string {
    const _position = toNumber(position);
    assert(
      () => _position >= 1,
      _lt("The position (%s) must be greater than or equal to 1.", _position.toString())
    );

    const _text = toString(text);
    const _length = toNumber(length);
    const _newText = toString(newText);
    return _text.substring(0, _position - 1) + _newText + _text.substring(_position - 1 + _length);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// RIGHT
// -----------------------------------------------------------------------------
export const RIGHT: AddFunctionDescription = {
  description: _lt("A substring from the end of a specified string."),
  args: [
    arg("text (string)", _lt("The string from which the right portion will be returned.")),
    arg(
      "number_of_characters (number, optional)",
      _lt("The number of characters to return from the right side of string.")
    ),
  ],
  returns: ["STRING"],
  compute: function (text: PrimitiveArgValue, ...args: PrimitiveArgValue[]): string {
    const _numberOfCharacters = args.length ? toNumber(args[0]) : 1;
    assert(
      () => _numberOfCharacters >= 0,
      _lt("The number_of_characters (%s) must be positive or null.", _numberOfCharacters.toString())
    );
    const _text = toString(text);
    const stringLength = _text.length;
    return _text.substring(stringLength - _numberOfCharacters, stringLength);
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// SEARCH
// -----------------------------------------------------------------------------
export const SEARCH: AddFunctionDescription = {
  description: _lt("First position of string found in text, ignoring case."),
  args: [
    arg("search_for (string)", _lt("The string to look for within text_to_search.")),
    arg(
      "text_to_search (string)",
      _lt("The text to search for the first occurrence of search_for.")
    ),
    arg(
      `starting_at (number, default=${DEFAULT_STARTING_AT})`,
      _lt("The character within text_to_search at which to start the search.")
    ),
  ],
  returns: ["NUMBER"],
  compute: function (
    searchFor: PrimitiveArgValue,
    textToSearch: PrimitiveArgValue,
    startingAt: PrimitiveArgValue = DEFAULT_STARTING_AT
  ): number {
    const _searchFor = toString(searchFor).toLowerCase();
    const _textToSearch = toString(textToSearch).toLowerCase();
    const _startingAt = toNumber(startingAt);

    assert(() => _textToSearch !== "", _lt(`The text_to_search must be non-empty.`));
    assert(
      () => _startingAt >= 1,
      _lt("The starting_at (%s) must be greater than or equal to 1.", _startingAt.toString())
    );

    const result = _textToSearch.indexOf(_searchFor, _startingAt - 1);

    assert(
      () => result >= 0,
      _lt(
        "In [[FUNCTION_NAME]] evaluation, cannot find '%s' within '%s'.",
        _searchFor,
        _textToSearch
      )
    );

    return result + 1;
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// SUBSTITUTE
// -----------------------------------------------------------------------------
export const SUBSTITUTE: AddFunctionDescription = {
  description: _lt("Replaces existing text with new text in a string."),
  args: [
    arg("text_to_search (string)", _lt("The text within which to search and replace.")),
    arg("search_for (string)", _lt("The string to search for within text_to_search.")),
    arg("replace_with (string)", _lt("The string that will replace search_for.")),
    arg(
      "occurrence_number (number, optional)",
      _lt(
        "The instance of search_for within text_to_search to replace with replace_with. By default, all occurrences of search_for are replaced; however, if occurrence_number is specified, only the indicated instance of search_for is replaced."
      )
    ),
  ],
  returns: ["NUMBER"],
  compute: function (
    textToSearch: PrimitiveArgValue,
    searchFor: PrimitiveArgValue,
    replaceWith: PrimitiveArgValue,
    occurrenceNumber: PrimitiveArgValue
  ): string {
    const _occurrenceNumber = toNumber(occurrenceNumber);

    assert(
      () => _occurrenceNumber >= 0,
      _lt("The occurrenceNumber (%s) must be positive or null.", _occurrenceNumber.toString())
    );

    const _textToSearch = toString(textToSearch);
    const _searchFor = toString(searchFor);
    if (_searchFor === "") {
      return _textToSearch;
    }

    const _replaceWith = toString(replaceWith);
    const reg = new RegExp(escapeRegExp(_searchFor), "g");
    if (_occurrenceNumber === 0) {
      return _textToSearch.replace(reg, _replaceWith);
    }

    let n = 0;
    return _textToSearch.replace(reg, (text) => (++n === _occurrenceNumber ? _replaceWith : text));
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// TEXTJOIN
// -----------------------------------------------------------------------------
export const TEXTJOIN: AddFunctionDescription = {
  description: _lt("Combines text from multiple strings and/or arrays."),
  args: [
    arg(
      "delimiter (string)",
      _lt(
        " A string, possible empty, or a reference to a valid string. If empty, the text will be simply concatenated."
      )
    ),
    arg(
      "ignore_empty (boolean)",
      _lt(
        "A boolean; if TRUE, empty cells selected in the text arguments won't be included in the result."
      )
    ),
    arg(
      "text1 (string, range<string>)",
      _lt("Any text item. This could be a string, or an array of strings in a range.")
    ),
    arg("text2 (string, range<string>, repeating)", _lt("Additional text item(s).")),
  ],
  returns: ["STRING"],
  compute: function (
    delimiter: PrimitiveArgValue,
    ignoreEmpty: PrimitiveArgValue,
    ...textsOrArrays: ArgValue[]
  ): string {
    const _delimiter = toString(delimiter);
    const _ignoreEmpty = toBoolean(ignoreEmpty);
    let n = 0;
    return reduceAny(
      textsOrArrays,
      (acc, a) =>
        !(_ignoreEmpty && toString(a) === "") ? (n++ ? acc + _delimiter : "") + toString(a) : acc,
      ""
    );
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// TRIM
// -----------------------------------------------------------------------------
export const TRIM: AddFunctionDescription = {
  description: _lt("Removes space characters."),
  args: [
    arg("text (string)", _lt("The text or reference to a cell containing text to be trimmed.")),
  ],
  returns: ["STRING"],
  compute: function (text: PrimitiveArgValue): string {
    return toString(text).trim();
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// UPPER
// -----------------------------------------------------------------------------
export const UPPER: AddFunctionDescription = {
  description: _lt("Converts a specified string to uppercase."),
  args: [arg("text (string)", _lt("The string to convert to uppercase."))],
  returns: ["STRING"],
  compute: function (text: PrimitiveArgValue): string {
    return toString(text).toUpperCase();
  },
  isExported: true,
};

// -----------------------------------------------------------------------------
// TEXT
// -----------------------------------------------------------------------------
export const TEXT: AddFunctionDescription = {
  description: _lt("Converts a number to text according to a specified format."),
  args: [
    arg("number (number)", _lt("The number, date or time to format.")),
    arg(
      "format (string)",
      _lt("The pattern by which to format the number, enclosed in quotation marks.")
    ),
  ],
  returns: ["STRING"],
  compute: function (number: PrimitiveArgValue, format: PrimitiveArgValue): string {
    const _number = toNumber(number);
    return formatValue(_number, toString(format));
  },
  isExported: true,
};
