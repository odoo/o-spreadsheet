import { escapeRegExp } from "../helpers/";
import { formatValue } from "../helpers/format/format";
import { trimContent } from "../helpers/misc";
import { _t } from "../translation";
import { CellErrorType, EvaluationError, NotAvailableError } from "../types/errors";
import { AddFunctionDescription } from "../types/functions";
import { Arg, FunctionResultObject, Maybe } from "../types/misc";
import { arg } from "./arguments";
import { reduceAny, toBoolean, toMatrix, toNumber, toString, transposeMatrix } from "./helpers";

const DEFAULT_STARTING_AT = 1;

/** Regex matching all the words in a string */
const wordRegex = /[A-Za-zÀ-ÖØ-öø-ÿ]+/g;

const MATCH_MODE_OPTIONS = [
  { value: 0, label: _t("Case-sensitive (default)") },
  { value: 1, label: _t("Case-insensitive") },
];
const MATCH_END_OPTIONS = [
  { value: 0, label: _t("Don't match to end (default)") },
  { value: 1, label: _t("Match to end") },
];

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
  compute: function (tableNumber: Maybe<FunctionResultObject>) {
    const _tableNumber = Math.trunc(toNumber(tableNumber, this.locale));
    if (_tableNumber < 1) {
      return new EvaluationError(_t("The table_number (%s) is out of range.", _tableNumber));
    }
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
  compute: function (text: Maybe<FunctionResultObject>): string {
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
  args: [arg("string (string, range<string>, repeating)", _t("String to append in sequence."))],
  compute: function (...datas: Arg[]): string {
    return reduceAny(datas, (acc, a) => acc + toString(a), "");
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
  compute: function (
    string1: Maybe<FunctionResultObject>,
    string2: Maybe<FunctionResultObject>
  ): boolean {
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
  compute: function (
    searchFor: Maybe<FunctionResultObject>,
    textToSearch: Maybe<FunctionResultObject>,
    startingAt: Maybe<FunctionResultObject> = { value: DEFAULT_STARTING_AT }
  ) {
    const _searchFor = toString(searchFor);
    const _textToSearch = toString(textToSearch);
    const _startingAt = toNumber(startingAt, this.locale);

    if (_textToSearch === "") {
      return new EvaluationError(_t("The text_to_search must be non-empty."));
    }
    if (_startingAt < 1) {
      return new EvaluationError(
        _t("The starting_at (%s) must be greater than or equal to 1.", _startingAt)
      );
    }

    const result = _textToSearch.indexOf(_searchFor, _startingAt - 1);

    if (result === -1) {
      return new EvaluationError(
        _t(
          "In [[FUNCTION_NAME]] evaluation, cannot find '%s' within '%s'.",
          _searchFor,
          _textToSearch
        )
      );
    }

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
      "value_or_array (string, range<string>, repeating)",
      _t("Value to be appended using delimiter.")
    ),
  ],
  compute: function (delimiter: Maybe<FunctionResultObject>, ...valuesOrArrays: Arg[]): string {
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
  compute: function (text: Maybe<FunctionResultObject>, ...args: Maybe<FunctionResultObject>[]) {
    const _numberOfCharacters = args.length ? toNumber(args[0], this.locale) : 1;

    if (_numberOfCharacters < 0) {
      return new EvaluationError(
        _t("The number_of_characters (%s) must be positive or null.", _numberOfCharacters)
      );
    }
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
  compute: function (text: Maybe<FunctionResultObject>): number {
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
  compute: function (text: Maybe<FunctionResultObject>): string {
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
  compute: function (
    text: Maybe<FunctionResultObject>,
    starting_at: Maybe<FunctionResultObject>,
    extract_length: Maybe<FunctionResultObject>
  ) {
    const _text = toString(text);
    const _starting_at = toNumber(starting_at, this.locale);
    const _extract_length = toNumber(extract_length, this.locale);

    if (_starting_at < 1) {
      return new EvaluationError(
        _t(
          "The starting_at argument (%s) must be positive greater than one.",
          _starting_at.toString()
        )
      );
    }
    if (_extract_length < 0) {
      return new EvaluationError(
        _t("The extract_length argument (%s) must be positive or null.", _extract_length)
      );
    }

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
  compute: function (text: Maybe<FunctionResultObject>): string {
    const _text = toString(text);
    return _text.replace(wordRegex, (word): string => {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });
  },
  isExported: true,
} satisfies AddFunctionDescription;

const REGEXEXTRACT_DEFAULT_MODE = 0;
const REGEXEXTRACT_DEFAULT_CASE_SENSITIVITY = 0;
const REGEXEXTRACT_DEFAULT_OCCURRENCE = 0;

// -----------------------------------------------------------------------------
// REGEXTEST
// -----------------------------------------------------------------------------
export const REGEXTEST = {
  description: _t("Checks whether a string matches the supplied regular expression."),
  args: [
    arg("text (string)", _t("The string to test.")),
    arg("pattern (string)", _t("The regular expression pattern to match against the text.")),
    arg(
      `case_sensitivity (number, default=${REGEXEXTRACT_DEFAULT_CASE_SENSITIVITY})`,
      _t("Whether the match is case-sensitive."),
      [
        { value: 0, label: _t("Case-sensitive") },
        { value: 1, label: _t("Case-insensitive") },
      ]
    ),
  ],
  compute: function (
    text: Maybe<FunctionResultObject>,
    pattern: Maybe<FunctionResultObject>,
    newText: Maybe<FunctionResultObject> = { value: REGEXEXTRACT_DEFAULT_CASE_SENSITIVITY }
  ) {
    const _text = toString(text);
    const _pattern = toString(pattern);
    const _caseSensitivity = toNumber(newText, this.locale);

    if (_pattern === "") {
      return true;
    }
    if (_text === "") {
      return false;
    }
    if (_caseSensitivity !== 0 && _caseSensitivity !== 1) {
      return new EvaluationError(_t("The case_sensitivity (%s) must be 0 or 1.", _caseSensitivity));
    }

    const flags = _caseSensitivity === 1 ? "gi" : "g";
    let regex: RegExp;
    try {
      regex = new RegExp(_pattern, flags);
    } catch (e) {
      return new EvaluationError(_t("Invalid regular expression"));
    }

    return regex.test(_text);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// REGEXEXTRACT
// -----------------------------------------------------------------------------
export const REGEXEXTRACT = {
  description: _t("Extract text from a string based on the supplied regular expression."),
  args: [
    arg("text (string)", _t("The string on which you want to extract text.")),
    arg("pattern (string)", _t("The regular expression pattern to match against the text.")),
    arg(
      `return_mode (number, default=${REGEXEXTRACT_DEFAULT_MODE})`,
      _t(
        "0 = first match, 1 = all matches as an array, 2 = capturing groups from the first match as an array."
      ),
      [
        { value: 0, label: _t("First match") },
        { value: 1, label: _t("All matches") },
        { value: 2, label: _t("Capture groups of first match") },
      ]
    ),
    arg(
      `case_sensitivity (number, default=${REGEXEXTRACT_DEFAULT_CASE_SENSITIVITY})`,
      _t("Whether the match is case-sensitive."),
      [
        { value: 0, label: _t("Case-sensitive") },
        { value: 1, label: _t("Case-insensitive") },
      ]
    ),
  ],
  compute: function (
    text: Maybe<FunctionResultObject>,
    pattern: Maybe<FunctionResultObject>,
    return_mode: Maybe<FunctionResultObject> = { value: REGEXEXTRACT_DEFAULT_MODE },
    newText: Maybe<FunctionResultObject> = { value: REGEXEXTRACT_DEFAULT_CASE_SENSITIVITY }
  ) {
    const _text = toString(text);
    const _pattern = toString(pattern);
    const _returnMode = toNumber(return_mode, this.locale);
    const _caseSensitivity = toNumber(newText, this.locale);

    if (_text === "" || _pattern === "") {
      return { value: "" };
    }
    if (_returnMode < 0 || _returnMode > 2) {
      return new EvaluationError(_t("The return_mode (%s) must be 0, 1 or 2.", _returnMode));
    }
    if (_caseSensitivity !== 0 && _caseSensitivity !== 1) {
      return new EvaluationError(_t("The case_sensitivity (%s) must be 0 or 1.", _caseSensitivity));
    }

    const flags = _caseSensitivity === 1 ? "gi" : "g";
    const regex = new RegExp(_pattern, flags);
    const matches = [..._text.matchAll(regex)];

    if (matches.length === 0) {
      return { value: CellErrorType.NotAvailable, message: _t("No matches found.") };
    }

    if (_returnMode === 0) {
      return matches[0][0];
    } else if (_returnMode === 1) {
      return matches.map((match) => [match[0]]);
    } else {
      if (matches[0].length < 2) {
        return new EvaluationError(_t("No capturing groups found."));
      }
      return matches[0].slice(1).map((s) => [s]);
    }
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// REGEXREPLACE
// -----------------------------------------------------------------------------

export const REGEXREPLACE = {
  description: _t("Replace text in a string based on the supplied regular expression."),
  args: [
    arg("text (string)", _t("The string in which you want to replace text.")),
    arg("pattern (string)", _t("The regular expression pattern to match against the text.")),
    arg("replacement (string)", _t("The text to use as the replacement.")),
    arg(
      `occurrence (number, default=${REGEXEXTRACT_DEFAULT_OCCURRENCE})`,
      _t("0 = replace all matches. A negative number counts from the end.")
    ),
    arg(
      `case_sensitivity (number, default=${REGEXEXTRACT_DEFAULT_CASE_SENSITIVITY})`,
      _t("Whether the match is case-sensitive."),
      [
        { value: 0, label: _t("Case-sensitive") },
        { value: 1, label: _t("Case-insensitive") },
      ]
    ),
  ],
  compute: function (
    text: Maybe<FunctionResultObject>,
    pattern: Maybe<FunctionResultObject>,
    replacement: Maybe<FunctionResultObject>,
    occurence: Maybe<FunctionResultObject> = { value: REGEXEXTRACT_DEFAULT_OCCURRENCE },
    newText: Maybe<FunctionResultObject> = { value: REGEXEXTRACT_DEFAULT_CASE_SENSITIVITY }
  ) {
    const _text = toString(text);
    const _pattern = toString(pattern);
    const _replacement = toString(replacement);
    const _occurence = toNumber(occurence, this.locale);
    const _caseSensitivity = toNumber(newText, this.locale);

    if (_caseSensitivity !== 0 && _caseSensitivity !== 1) {
      return new EvaluationError(_t("The case_sensitivity (%s) must be 0 or 1.", _caseSensitivity));
    }

    const flags = _caseSensitivity === 1 ? "gi" : "g";
    let regex: RegExp;
    try {
      regex = new RegExp(_pattern, flags);
    } catch (e) {
      return new EvaluationError(_t("Invalid regular expression"));
    }

    if (_occurence !== 0) {
      const matches = [..._text.matchAll(regex)];
      if (matches.length === 0 || Math.abs(_occurence) > matches.length) {
        return _text;
      }
      const i = _occurence > 0 ? _occurence - 1 : matches.length + _occurence;
      const length = matches[i][0].length;
      const position = matches[i].index;
      return _text.substring(0, position) + _replacement + _text.substring(position + length);
    }
    return _text.replace(regex, _replacement);
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
  compute: function (
    text: Maybe<FunctionResultObject>,
    position: Maybe<FunctionResultObject>,
    length: Maybe<FunctionResultObject>,
    newText: Maybe<FunctionResultObject>
  ) {
    const _position = toNumber(position, this.locale);
    if (_position < 1) {
      return new EvaluationError(
        _t("The position (%s) must be greater than or equal to 1.", _position)
      );
    }

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
  compute: function (text: Maybe<FunctionResultObject>, ...args: Maybe<FunctionResultObject>[]) {
    const _numberOfCharacters = args.length ? toNumber(args[0], this.locale) : 1;
    if (_numberOfCharacters < 0) {
      return new EvaluationError(
        _t("The number_of_characters (%s) must be positive or null.", _numberOfCharacters)
      );
    }
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
  compute: function (
    searchFor: Maybe<FunctionResultObject>,
    textToSearch: Maybe<FunctionResultObject>,
    startingAt: Maybe<FunctionResultObject> = { value: DEFAULT_STARTING_AT }
  ) {
    const _searchFor = toString(searchFor).toLowerCase();
    const _textToSearch = toString(textToSearch).toLowerCase();
    const _startingAt = toNumber(startingAt, this.locale);
    if (_textToSearch === "") {
      return {
        value: CellErrorType.GenericError,
        message: _t("The text_to_search must be non-empty."),
      };
    }
    if (_startingAt < 1) {
      return {
        value: CellErrorType.GenericError,
        message: _t("The starting_at (%s) must be greater than or equal to 1.", _startingAt),
      };
    }

    const result = _textToSearch.indexOf(_searchFor, _startingAt - 1);
    if (result === -1) {
      return {
        value: CellErrorType.GenericError,
        message: _t(
          "In [[FUNCTION_NAME]] evaluation, cannot find '%s' within '%s'.",
          _searchFor,
          _textToSearch
        ),
      };
    }
    return { value: result + 1 };
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
  compute: function (
    text: Maybe<FunctionResultObject>,
    delimiter: Maybe<FunctionResultObject>,
    splitByEach: Maybe<FunctionResultObject> = { value: SPLIT_DEFAULT_SPLIT_BY_EACH },
    removeEmptyText: Maybe<FunctionResultObject> = { value: SPLIT_DEFAULT_REMOVE_EMPTY_TEXT }
  ) {
    const _text = toString(text);
    const _delimiter = escapeRegExp(toString(delimiter));
    const _splitByEach = toBoolean(splitByEach);
    const _removeEmptyText = toBoolean(removeEmptyText);

    if (_delimiter.length <= 0) {
      return new EvaluationError(_t("The delimiter (%s) must be not be empty.", _delimiter));
    }

    const regex = _splitByEach ? new RegExp(`[${_delimiter}]`, "g") : new RegExp(_delimiter, "g");
    let result = _text.split(regex);

    if (_removeEmptyText) {
      result = result.filter((text) => text !== "");
    }

    return transposeMatrix([result]);
  },
  isExported: false,
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
  compute: function (
    textToSearch: Maybe<FunctionResultObject>,
    searchFor: Maybe<FunctionResultObject>,
    replaceWith: Maybe<FunctionResultObject>,
    occurrenceNumber: Maybe<FunctionResultObject>
  ) {
    const _occurrenceNumber = toNumber(occurrenceNumber, this.locale);

    if (_occurrenceNumber < 0) {
      return new EvaluationError(
        _t("The occurrenceNumber (%s) must be positive or null.", _occurrenceNumber)
      );
    }

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

const TEXTJOIN_DEFAULT_IGNORE_EMPTY = true;

export const TEXTJOIN = {
  description: _t("Combines text from multiple strings and/or arrays."),
  args: [
    arg(
      "delimiter (string)",
      _t(
        "A string, possible empty, or a reference to a valid string. If empty, the text will be simply concatenated."
      )
    ),
    arg(
      "ignore_empty (boolean)",
      _t(
        "A boolean; if TRUE, empty cells selected in the text arguments won't be included in the result."
      ),
      [
        { value: true, label: _t("Ignore empty cells") },
        { value: false, label: _t("Include empty cells (default)") },
      ]
    ),
    arg("texts (string, range<string>, repeating)", _t("Text item to join.")),
  ],
  compute: function (
    delimiter: Maybe<FunctionResultObject>,
    ignoreEmpty: Maybe<FunctionResultObject> = { value: TEXTJOIN_DEFAULT_IGNORE_EMPTY },
    ...textsOrArrays: Arg[]
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
// TEXTSPLIT
// -----------------------------------------------------------------------------

const TEXTSPLIT_DEFAULT_IGNORE_EMPTY = false;
const TEXTSPLIT_DEFAULT_MATCH_MODE = 0;

export const TEXTSPLIT = {
  description: _t("Splits text into rows or columns using specified column and row delimiters."),
  args: [
    arg("text (string)", _t("The text to split.")),
    arg("col_delimiter (string, range<string>)", _t("Character or string to split columns by.")),
    arg(
      "row_delimiter (string, range<string>, optional)",
      _t("Character or string to split rows by.")
    ),
    arg(
      `ignore_empty (boolean, default=${TEXTSPLIT_DEFAULT_IGNORE_EMPTY})`,
      _t("Whether to ignore empty cells."),
      [
        { value: false, label: _t("Include empty cells (default)") },
        { value: true, label: _t("Ignore empty cells") },
      ]
    ),
    arg(
      `match_mode (number, default=${TEXTSPLIT_DEFAULT_MATCH_MODE})`,
      _t("Searches the text for a delimiter match. By default, a case-sensitive match is done."),
      MATCH_MODE_OPTIONS
    ),
    arg(
      `pad_with (string, default="${CellErrorType.NotAvailable}")`,
      _t("The value to use for padding empty cells.")
    ),
  ],
  compute: function (
    text: FunctionResultObject,
    colDelimiter: Arg,
    rowDelimiter: Arg,
    ignoreEmpty: Maybe<FunctionResultObject> = { value: TEXTSPLIT_DEFAULT_IGNORE_EMPTY },
    matchMode: Maybe<FunctionResultObject> = { value: TEXTSPLIT_DEFAULT_MATCH_MODE },
    padWith: Maybe<FunctionResultObject> = new NotAvailableError()
  ) {
    const _text = toString(text);
    if (_text.length <= 0) {
      return new EvaluationError(_t("No text to split."));
    }

    if (colDelimiter === undefined && rowDelimiter === undefined) {
      return new EvaluationError(_t("At least one delimiter must be provided."));
    }

    const _colDelimiters = toMatrix(colDelimiter)
      .flat()
      .map((v) => escapeRegExp(toString(v)));
    const _rowDelimiters = toMatrix(rowDelimiter)
      .flat()
      .map((v) => escapeRegExp(toString(v)));

    if (_colDelimiters.some((v) => v === "") || _rowDelimiters.some((v) => v === "")) {
      return new EvaluationError(_t("The delimiters cannot be empty values."));
    }

    const _ignoreEmpty = toBoolean(ignoreEmpty);

    const _matchMode = toNumber(matchMode, this.locale);
    if (![0, 1].includes(_matchMode)) {
      return new EvaluationError(_t("match_mode should be a value of 0 or 1."));
    }

    const cells: FunctionResultObject[][] = [];
    const regexpFlags = _matchMode === 1 ? "gi" : "g";

    // only keep the row delimiters that are not in the column delimiters to prioritize spliting by columns
    const filteredRowDelimiters = _rowDelimiters.filter((delim) => !_colDelimiters.includes(delim));
    let rowParts = filteredRowDelimiters.length
      ? _text.split(new RegExp(filteredRowDelimiters.join("|"), regexpFlags))
      : [_text];

    if (_ignoreEmpty) {
      rowParts = rowParts.filter((v) => v !== "");
    }

    const colRegexp = new RegExp(_colDelimiters.join("|"), regexpFlags);

    for (const rowText of rowParts) {
      let columns = _colDelimiters.length ? rowText.split(colRegexp) : [rowText];
      if (_ignoreEmpty) {
        columns = columns.filter((v) => v !== "");
      }
      cells.push(columns.map((value) => ({ value })));
    }

    const maxLength = Math.max(...cells.map((row) => row.length));
    for (const row of cells) {
      while (row.length < maxLength) {
        row.push(padWith);
      }
    }

    return transposeMatrix(cells);
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
  compute: function (text: Maybe<FunctionResultObject>): string {
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
  compute: function (text: Maybe<FunctionResultObject>): string {
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
      _t(
        'The case-sensitive format of the result, enclosed in quotation marks. Examples: "0.00" rounded to 2 decimal places, "hh:mm:ss" for hour:minutes:seconds.'
      )
    ),
  ],
  compute: function (
    number: Maybe<FunctionResultObject>,
    format: Maybe<FunctionResultObject>
  ): string {
    const _number = toNumber(number, this.locale);
    return formatValue(_number, { format: toString(format), locale: this.locale });
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// VALUE
// -----------------------------------------------------------------------------
export const VALUE = {
  description: _t("Converts a string to a numeric value."),
  args: [arg("value (number)", _t("the string to be converted"))],
  compute: function (value: Maybe<FunctionResultObject>): number {
    return toNumber(value, this.locale);
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// TEXTAFTER
// -----------------------------------------------------------------------------

const TEXT_FN_DEFAULT_INSTANCE = 1;
const TEXT_FN_DEFAULT_MATCH_MODE = 0;
const TEXT_FN_DEFAULT_MATCH_END = 0;

export const TEXTAFTER = {
  description: _t("Returns text that occurs after a given substring or delimiter."),
  args: [
    arg("text (string)", _t("The source text.")),
    arg("delimiter (string)", _t("The substring after which text will be returned.")),
    arg(
      `instance_num (number, default=${TEXT_FN_DEFAULT_INSTANCE})`,
      _t(
        "The desired instance of the delimiter after which we extract the text. A negative number searches from the end."
      )
    ),
    arg(
      `match_mode (number, default=${TEXT_FN_DEFAULT_MATCH_MODE})`,
      _t("Searches the text for a delimiter match. By default, a case-sensitive match is done."),
      MATCH_MODE_OPTIONS
    ),
    arg(
      `match_end (number, default=${TEXT_FN_DEFAULT_MATCH_END}))`,
      _t("Whether to treat the end of text as a delimiter."),
      MATCH_END_OPTIONS
    ),
    arg(
      `if_not_found (string, default="${CellErrorType.NotAvailable}")`,
      _t("Value to return if the delimiter is not found.")
    ),
  ],
  compute: function (
    text: FunctionResultObject,
    delimiter: FunctionResultObject,
    matchIndex: Maybe<FunctionResultObject> = { value: TEXT_FN_DEFAULT_INSTANCE },
    matchMode: Maybe<FunctionResultObject> = { value: TEXT_FN_DEFAULT_MATCH_MODE },
    matchEnd: Maybe<FunctionResultObject> = { value: TEXT_FN_DEFAULT_MATCH_END },
    ifNotFound: Maybe<FunctionResultObject> = new NotAvailableError()
  ) {
    const _text = toString(text);
    const _matchIndex = toNumber(matchIndex, this.locale);
    const _matchMode = toNumber(matchMode, this.locale);
    const _matchEnd = toNumber(matchEnd, this.locale);

    if (_matchIndex === 0) {
      return new EvaluationError(_t("The instance_num (%s) must not be zero.", _matchIndex));
    }
    if (_matchMode !== 0 && _matchMode !== 1) {
      return new EvaluationError(_t("match_mode should have a value of 0 or 1."));
    }
    if (_matchEnd !== 0 && _matchEnd !== 1) {
      return new EvaluationError(_t("match_end should have a value of 0 or 1."));
    }

    const _delimiter = toString(delimiter);
    if (_delimiter === "") {
      return Math.sign(_matchIndex) > 0 ? { value: _text } : { value: "" };
    }

    const flags = _matchMode === 1 ? "gi" : "g";
    const pattern = escapeRegExp(_delimiter);
    const regexp = new RegExp(pattern, flags);

    let matchIndices = [..._text.matchAll(regexp)].map((match) => match.index + pattern.length);
    if (_matchIndex < 0) {
      matchIndices = matchIndices.reverse();
    }

    // If _matchEnd, we act like the text is appended by the delimiter (or prepended if negative index)
    if (_matchEnd && Math.abs(_matchIndex) === matchIndices.length + 1) {
      return Math.sign(_matchIndex) > 0 ? { value: "" } : { value: _text };
    }

    const targetIndex = matchIndices[Math.abs(_matchIndex) - 1];
    return targetIndex === undefined ? ifNotFound : { value: _text.substring(targetIndex) };
  },
  isExported: true,
} satisfies AddFunctionDescription;

// -----------------------------------------------------------------------------
// TEXTBEFORE
// -----------------------------------------------------------------------------

export const TEXTBEFORE = {
  description: _t("Returns text that occurs before a given substring or delimiter."),
  args: [
    arg("text (string)", _t("The source text.")),
    arg("delimiter (string)", _t("The substring after which text will be returned.")),
    arg(
      `instance_num (number, default=${TEXT_FN_DEFAULT_INSTANCE})`,
      _t(
        "The desired instance of the delimiter before which we extract the text. A negative number searches from the end."
      )
    ),
    arg(
      `match_mode (number, default=${TEXT_FN_DEFAULT_MATCH_MODE})`,
      _t("Searches the text for a delimiter match. By default, a case-sensitive match is done."),
      MATCH_MODE_OPTIONS
    ),
    arg(
      `match_end (number, default=${TEXT_FN_DEFAULT_MATCH_END}))`,
      _t("Whether to match a delimiter against the end of the text."),
      MATCH_END_OPTIONS
    ),
    arg(
      `if_not_found (string, default="${CellErrorType.NotAvailable}")`,
      _t("Value to return if the delimiter is not found.")
    ),
  ],
  compute: function (
    text: FunctionResultObject,
    delimiter: FunctionResultObject,
    matchIndex: Maybe<FunctionResultObject> = { value: TEXT_FN_DEFAULT_INSTANCE },
    matchMode: Maybe<FunctionResultObject> = { value: TEXT_FN_DEFAULT_MATCH_MODE },
    matchEnd: Maybe<FunctionResultObject> = { value: TEXT_FN_DEFAULT_MATCH_END },
    ifNotFound: Maybe<FunctionResultObject> = new NotAvailableError()
  ) {
    const _text = toString(text);
    const _matchIndex = toNumber(matchIndex, this.locale);
    const _matchMode = toNumber(matchMode, this.locale);
    const _matchEnd = toNumber(matchEnd, this.locale);

    if (_matchIndex === 0) {
      return new EvaluationError(_t("The instance_num (%s) must not be zero.", _matchIndex));
    }
    if (_matchMode !== 0 && _matchMode !== 1) {
      return new EvaluationError(_t("match_mode should have a value of 0 or 1."));
    }
    if (_matchEnd !== 0 && _matchEnd !== 1) {
      return new EvaluationError(_t("match_end should have a value of 0 or 1."));
    }

    const _delimiter = toString(delimiter);
    if (_delimiter === "") {
      return Math.sign(_matchIndex) > 0 ? { value: "" } : { value: _text };
    }

    const flags = _matchMode === 1 ? "gi" : "g";
    const pattern = escapeRegExp(_delimiter);
    const regexp = new RegExp(pattern, flags);

    let matchIndices = [..._text.matchAll(regexp)].map((match) => match.index + pattern.length);
    if (_matchIndex < 0) {
      matchIndices = matchIndices.reverse();
    }

    // If _matchEnd, we act like the text is appended by the delimiter (or prepended if negative index)
    if (_matchEnd && Math.abs(_matchIndex) === matchIndices.length + 1) {
      return Math.sign(_matchIndex) > 0 ? { value: _text } : { value: "" };
    }

    const targetIndex = matchIndices[Math.abs(_matchIndex) - 1];
    return targetIndex === undefined
      ? ifNotFound
      : { value: _text.substring(0, targetIndex - _delimiter.length) };
  },
  isExported: true,
} satisfies AddFunctionDescription;
