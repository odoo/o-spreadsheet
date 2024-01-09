import { escapeRegExp, formatValue, trimContent } from "../helpers";
import { _t } from "../translation";
import { AddFunctionDescription, ArgValue, CellValue, Matrix, Maybe } from "../types";
import { arg } from "./arguments";
import { assert, reduceAny, toBoolean, toNumber, toString, transposeMatrix } from "./helpers";

const DEFAULT_STARTING_AT = 1;

/** Regex matching all the words in a string */
const wordRegex = /[A-Za-zÀ-ÖØ-öø-ÿ]+/g;

// -----------------------------------------------------------------------------
// CHAR
// -----------------------------------------------------------------------------
export const CHAR = {
  description: _t("Gets character associated with number."),
  args: [
    arg(
      "table_number (number)",
      _t("The number of the character to look up from the current Unicode table in decimal format.")
    ),
  ],
  returns: ["STRING"],
  compute: function (tableNumber: Maybe<CellValue>): string {
    const _tableNumber = Math.trunc(toNumber(tableNumber, this.locale));
    assert(
      () => _tableNumber >= 1,
      _t("The table_number (%s) is out of range.", _tableNumber.toString())
    );
    return String.fromCharCode(_tableNumber);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// CLEAN
// -----------------------------------------------------------------------------
export const CLEAN = {
  description: _t("Remove non-printable characters from a piece of text."),
  args: [arg("text (string)", _t("The text whose non-printable characters are to be removed."))],
  returns: ["STRING"],
  compute: function (text: Maybe<CellValue>): string {
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
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// CONCATENATE
// -----------------------------------------------------------------------------
export const CONCATENATE = {
  description: _t("Appends strings to one another."),
  args: [
    arg("string1 (string, range<string>)", _t("The initial string.")),
    arg("string2 (string, range<string>, repeating)", _t("More strings to append in sequence.")),
  ],
  returns: ["STRING"],
  compute: function (...values: ArgValue[]): string {
    return reduceAny(values, (acc, a) => acc + toString(a), "");
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// EXACT
// -----------------------------------------------------------------------------
export const EXACT = {
  description: _t("Tests whether two strings are identical."),
  args: [
    arg("string1 (string)", _t("The first string to compare.")),
    arg("string2 (string)", _t("The second string to compare.")),
  ],
  returns: ["BOOLEAN"],
  compute: function (string1: Maybe<CellValue>, string2: Maybe<CellValue>): boolean {
    return toString(string1) === toString(string2);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// FIND
// -----------------------------------------------------------------------------
export const FIND = {
  description: _t("First position of string found in text, case-sensitive."),
  args: [
    arg("search_for (string)", _t("The string to look for within text_to_search.")),
    arg(
      "text_to_search (string)",
      _t("The text to search for the first occurrence of search_for.")
    ),
    arg(
      `starting_at (number, default=${DEFAULT_STARTING_AT})`,
      _t("The character within text_to_search at which to start the search.")
    ),
  ],
  returns: ["NUMBER"],
  compute: function (
    searchFor: Maybe<CellValue>,
    textToSearch: Maybe<CellValue>,
    startingAt: Maybe<CellValue> = DEFAULT_STARTING_AT
  ): number {
    const _searchFor = toString(searchFor);
    const _textToSearch = toString(textToSearch);
    const _startingAt = toNumber(startingAt, this.locale);

    assert(() => _textToSearch !== "", _t("The text_to_search must be non-empty."));
    assert(
      () => _startingAt >= 1,
      _t("The starting_at (%s) must be greater than or equal to 1.", _startingAt.toString())
    );

    const result = _textToSearch.indexOf(_searchFor, _startingAt - 1);

    assert(
      () => result >= 0,
      _t(
        "In [[FUNCTION_NAME]] evaluation, cannot find '%s' within '%s'.",
        _searchFor.toString(),
        _textToSearch
      )
    );

    return result + 1;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// JOIN
// -----------------------------------------------------------------------------
export const JOIN = {
  description: _t("Concatenates elements of arrays with delimiter."),
  args: [
    arg(
      "delimiter (string)",
      _t("The character or string to place between each concatenated value.")
    ),
    arg(
      "value_or_array1 (string, range<string>)",
      _t("The value or values to be appended using delimiter.")
    ),
    arg(
      "value_or_array2 (string, range<string>, repeating)",
      _t("More values to be appended using delimiter.")
    ),
  ],
  returns: ["STRING"],
  compute: function (delimiter: Maybe<CellValue>, ...valuesOrArrays: ArgValue[]): string {
    const _delimiter = toString(delimiter);
    return reduceAny(valuesOrArrays, (acc, a) => (acc ? acc + _delimiter : "") + toString(a), "");
  },
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// LEFT
// -----------------------------------------------------------------------------
export const LEFT = {
  description: _t("Substring from beginning of specified string."),
  args: [
    arg("text (string)", _t("The string from which the left portion will be returned.")),
    arg(
      "number_of_characters (number, optional)",
      _t("The number of characters to return from the left side of string.")
    ),
  ],
  returns: ["STRING"],
  compute: function (text: Maybe<CellValue>, ...args: Maybe<CellValue>[]): string {
    const _numberOfCharacters = args.length ? toNumber(args[0], this.locale) : 1;
    assert(
      () => _numberOfCharacters >= 0,
      _t("The number_of_characters (%s) must be positive or null.", _numberOfCharacters.toString())
    );
    return toString(text).substring(0, _numberOfCharacters);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// LEN
// -----------------------------------------------------------------------------
export const LEN = {
  description: _t("Length of a string."),
  args: [arg("text (string)", _t("The string whose length will be returned."))],
  returns: ["NUMBER"],
  compute: function (text: Maybe<CellValue>): number {
    return toString(text).length;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// LOWER
// -----------------------------------------------------------------------------
export const LOWER = {
  description: _t("Converts a specified string to lowercase."),
  args: [arg("text (string)", _t("The string to convert to lowercase."))],
  returns: ["STRING"],
  compute: function (text: Maybe<CellValue>): string {
    return toString(text).toLowerCase();
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// MID
// -----------------------------------------------------------------------------
export const MID = {
  description: _t("A segment of a string."),
  args: [
    arg("text (string)", _t("The string to extract a segment from.")),
    arg(
      "starting_at (number)",
      _t(
        "The index from the left of string from which to begin extracting. The first character in string has the index 1."
      )
    ),
    arg("extract_length (number)", _t("The length of the segment to extract.")),
  ],
  returns: ["STRING"],
  compute: function (
    text: Maybe<CellValue>,
    starting_at: Maybe<CellValue>,
    extract_length: Maybe<CellValue>
  ): string {
    const _text = toString(text);
    const _starting_at = toNumber(starting_at, this.locale);
    const _extract_length = toNumber(extract_length, this.locale);

    assert(
      () => _starting_at >= 1,
      _t(
        "The starting_at argument (%s) must be positive greater than one.",
        _starting_at.toString()
      )
    );
    assert(
      () => _extract_length >= 0,
      _t("The extract_length argument (%s) must be positive or null.", _extract_length.toString())
    );

    return _text.slice(_starting_at - 1, _starting_at + _extract_length - 1);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// PROPER
// -----------------------------------------------------------------------------
export const PROPER = {
  description: _t("Capitalizes each word in a specified string."),
  args: [
    arg(
      "text_to_capitalize (string)",
      _t(
        "The text which will be returned with the first letter of each word in uppercase and all other letters in lowercase."
      )
    ),
  ],
  returns: ["STRING"],
  compute: function (text: Maybe<CellValue>): string {
    const _text = toString(text);
    return _text.replace(wordRegex, (word): string => {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// REPLACE
// -----------------------------------------------------------------------------
export const REPLACE = {
  description: _t("Replaces part of a text string with different text."),
  args: [
    arg("text (string)", _t("The text, a part of which will be replaced.")),
    arg(
      "position (number)",
      _t("The position where the replacement will begin (starting from 1).")
    ),
    arg("length (number)", _t("The number of characters in the text to be replaced.")),
    arg("new_text (string)", _t("The text which will be inserted into the original text.")),
  ],
  returns: ["STRING"],
  compute: function (
    text: Maybe<CellValue>,
    position: Maybe<CellValue>,
    length: Maybe<CellValue>,
    newText: Maybe<CellValue>
  ): string {
    const _position = toNumber(position, this.locale);
    assert(
      () => _position >= 1,
      _t("The position (%s) must be greater than or equal to 1.", _position.toString())
    );

    const _text = toString(text);
    const _length = toNumber(length, this.locale);
    const _newText = toString(newText);
    return _text.substring(0, _position - 1) + _newText + _text.substring(_position - 1 + _length);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// RIGHT
// -----------------------------------------------------------------------------
export const RIGHT = {
  description: _t("A substring from the end of a specified string."),
  args: [
    arg("text (string)", _t("The string from which the right portion will be returned.")),
    arg(
      "number_of_characters (number, optional)",
      _t("The number of characters to return from the right side of string.")
    ),
  ],
  returns: ["STRING"],
  compute: function (text: Maybe<CellValue>, ...args: Maybe<CellValue>[]): string {
    const _numberOfCharacters = args.length ? toNumber(args[0], this.locale) : 1;
    assert(
      () => _numberOfCharacters >= 0,
      _t("The number_of_characters (%s) must be positive or null.", _numberOfCharacters.toString())
    );
    const _text = toString(text);
    const stringLength = _text.length;
    return _text.substring(stringLength - _numberOfCharacters, stringLength);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// SEARCH
// -----------------------------------------------------------------------------
export const SEARCH = {
  description: _t("First position of string found in text, ignoring case."),
  args: [
    arg("search_for (string)", _t("The string to look for within text_to_search.")),
    arg(
      "text_to_search (string)",
      _t("The text to search for the first occurrence of search_for.")
    ),
    arg(
      `starting_at (number, default=${DEFAULT_STARTING_AT})`,
      _t("The character within text_to_search at which to start the search.")
    ),
  ],
  returns: ["NUMBER"],
  compute: function (
    searchFor: Maybe<CellValue>,
    textToSearch: Maybe<CellValue>,
    startingAt: Maybe<CellValue> = DEFAULT_STARTING_AT
  ): number {
    const _searchFor = toString(searchFor).toLowerCase();
    const _textToSearch = toString(textToSearch).toLowerCase();
    const _startingAt = toNumber(startingAt, this.locale);

    assert(() => _textToSearch !== "", _t("The text_to_search must be non-empty."));
    assert(
      () => _startingAt >= 1,
      _t("The starting_at (%s) must be greater than or equal to 1.", _startingAt.toString())
    );

    const result = _textToSearch.indexOf(_searchFor, _startingAt - 1);

    assert(
      () => result >= 0,
      _t(
        "In [[FUNCTION_NAME]] evaluation, cannot find '%s' within '%s'.",
        _searchFor,
        _textToSearch
      )
    );

    return result + 1;
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// SPLIT
// -----------------------------------------------------------------------------
const SPLIT_DEFAULT_SPLIT_BY_EACH = true;
const SPLIT_DEFAULT_REMOVE_EMPTY_TEXT = true;
export const SPLIT = {
  description: _t("Split text by specific character delimiter(s)."),
  args: [
    arg("text (string)", _t("The text to divide.")),
    arg("delimiter (string)", _t("The character or characters to use to split text.")),
    arg(
      `split_by_each (boolean, default=${SPLIT_DEFAULT_SPLIT_BY_EACH}})`,
      _t("Whether or not to divide text around each character contained in delimiter.")
    ),
    arg(
      `remove_empty_text (boolean, default=${SPLIT_DEFAULT_REMOVE_EMPTY_TEXT})`,
      _t(
        "Whether or not to remove empty text messages from the split results. The default behavior is to treat \
        consecutive delimiters as one (if TRUE). If FALSE, empty cells values are added between consecutive delimiters."
      )
    ),
  ],
  returns: ["RANGE<STRING>"],
  compute: function (
    text: Maybe<CellValue>,
    delimiter: Maybe<CellValue>,
    splitByEach: Maybe<CellValue> = SPLIT_DEFAULT_SPLIT_BY_EACH,
    removeEmptyText: Maybe<CellValue> = SPLIT_DEFAULT_REMOVE_EMPTY_TEXT
  ): Matrix<string> {
    const _text = toString(text);
    const _delimiter = escapeRegExp(toString(delimiter));
    const _splitByEach = toBoolean(splitByEach);
    const _removeEmptyText = toBoolean(removeEmptyText);

    assert(
      () => _delimiter.length > 0,
      _t("The _delimiter (%s) must be not be empty.", _delimiter)
    );

    const regex = _splitByEach ? new RegExp(`[${_delimiter}]`, "g") : new RegExp(_delimiter, "g");
    let result = _text.split(regex);

    if (_removeEmptyText) {
      result = result.filter((text) => text !== "");
    }

    return transposeMatrix([result]);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// SUBSTITUTE
// -----------------------------------------------------------------------------
export const SUBSTITUTE = {
  description: _t("Replaces existing text with new text in a string."),
  args: [
    arg("text_to_search (string)", _t("The text within which to search and replace.")),
    arg("search_for (string)", _t("The string to search for within text_to_search.")),
    arg("replace_with (string)", _t("The string that will replace search_for.")),
    arg(
      "occurrence_number (number, optional)",
      _t(
        "The instance of search_for within text_to_search to replace with replace_with. By default, all occurrences of search_for are replaced; however, if occurrence_number is specified, only the indicated instance of search_for is replaced."
      )
    ),
  ],
  returns: ["NUMBER"],
  compute: function (
    textToSearch: Maybe<CellValue>,
    searchFor: Maybe<CellValue>,
    replaceWith: Maybe<CellValue>,
    occurrenceNumber: Maybe<CellValue>
  ): string {
    const _occurrenceNumber = toNumber(occurrenceNumber, this.locale);

    assert(
      () => _occurrenceNumber >= 0,
      _t("The occurrenceNumber (%s) must be positive or null.", _occurrenceNumber.toString())
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
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// TEXTJOIN
// -----------------------------------------------------------------------------
export const TEXTJOIN = {
  description: _t("Combines text from multiple strings and/or arrays."),
  args: [
    arg(
      "delimiter (string)",
      _t(
        " A string, possible empty, or a reference to a valid string. If empty, the text will be simply concatenated."
      )
    ),
    arg(
      "ignore_empty (boolean)",
      _t(
        "A boolean; if TRUE, empty cells selected in the text arguments won't be included in the result."
      )
    ),
    arg(
      "text1 (string, range<string>)",
      _t("Any text item. This could be a string, or an array of strings in a range.")
    ),
    arg("text2 (string, range<string>, repeating)", _t("Additional text item(s).")),
  ],
  returns: ["STRING"],
  compute: function (
    delimiter: Maybe<CellValue>,
    ignoreEmpty: Maybe<CellValue>,
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
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// TRIM
// -----------------------------------------------------------------------------
export const TRIM = {
  description: _t("Removes space characters."),
  args: [
    arg("text (string)", _t("The text or reference to a cell containing text to be trimmed.")),
  ],
  returns: ["STRING"],
  compute: function (text: Maybe<CellValue>): string {
    return trimContent(toString(text));
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// UPPER
// -----------------------------------------------------------------------------
export const UPPER = {
  description: _t("Converts a specified string to uppercase."),
  args: [arg("text (string)", _t("The string to convert to uppercase."))],
  returns: ["STRING"],
  compute: function (text: Maybe<CellValue>): string {
    return toString(text).toUpperCase();
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// TEXT
// -----------------------------------------------------------------------------
export const TEXT = {
  description: _t("Converts a number to text according to a specified format."),
  args: [
    arg("number (number)", _t("The number, date or time to format.")),
    arg(
      "format (string)",
      _t("The pattern by which to format the number, enclosed in quotation marks.")
    ),
  ],
  returns: ["STRING"],
  compute: function (number: Maybe<CellValue>, format: Maybe<CellValue>): string {
    const _number = toNumber(number, this.locale);
    return formatValue(_number, { format: toString(format), locale: this.locale });
  },
  isExported: true,
} satisfies AddFunctionDescription;
