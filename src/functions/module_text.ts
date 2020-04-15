import { args } from "./arguments";
import { FunctionDescription } from "./index";
import { toNumber, toString, reduceArgs, toBoolean } from "./helpers";

// -----------------------------------------------------------------------------
// CHAR
// -----------------------------------------------------------------------------
export const CHAR: FunctionDescription = {
  description: "Gets character associated with number.",
  args: args`
      table_number (number) The number of the character to look up from the current Unicode table in decimal format.
    `,
  returns: ["STRING"],
  compute: function (table_number: any): string {
    const _tableNumber = Math.trunc(toNumber(table_number));
    if (_tableNumber < 1) {
      throw new Error(`Function CHAR parameter 1 value ${_tableNumber} is out of range.`);
    }
    return String.fromCharCode(_tableNumber);
  },
};

// -----------------------------------------------------------------------------
// CONCATENATE
// -----------------------------------------------------------------------------
export const CONCATENATE: FunctionDescription = {
  description: "Appends strings to one another.",
  args: args`
      string1 (string, range<string>) The initial string.
      string2 (string, range<string>, optional, repeating) More strings to append in sequence..
    `,
  returns: ["STRING"],
  compute: function (): string {
    return reduceArgs(arguments, (acc, a) => acc + toString(a), "");
  },
};

// -----------------------------------------------------------------------------
// EXACT
// -----------------------------------------------------------------------------
export const EXACT: FunctionDescription = {
  description: "Tests whether two strings are identical.",
  args: args`
      string1 (string) The first string to compare.
      string2 (string) The second string to compare.
    `,
  returns: ["BOOLEAN"],
  compute: function (string1: any, string2: any): boolean {
    return toString(string1) === toString(string2);
  },
};

// -----------------------------------------------------------------------------
// FIND
// -----------------------------------------------------------------------------
export const FIND: FunctionDescription = {
  description: "First position of string found in text, case-sensitive.",
  args: args`
      search_for (string) The string to look for within text_to_search.
      text_to_search (string) The text to search for the first occurrence of search_for.
      starting_at (number, optional, default=1 ) The character within text_to_search at which to start the search.
    `,
  returns: ["NUMBER"],
  compute: function (search_for: any, text_to_search: any, starting_at: any = 1): number {
    const _textToSearch = toString(text_to_search);
    if (_textToSearch === "") {
      throw new Error(`
        Function FIND parameter 2 value should be non-empty.`);
    }

    const _startingAt = toNumber(starting_at);
    if (_startingAt === 0) {
      throw new Error(`
        Function FIND parameter 3 value is 0. It should be greater than or equal to 1.`);
    }

    const _searchFor = toString(search_for);
    const result = _textToSearch.indexOf(_searchFor, _startingAt - 1);
    if (result < 0) {
      throw new Error(`
        In FIND evaluation, cannot find '${_searchFor}' within '${_textToSearch}'.`);
    }
    return result + 1;
  },
};

// -----------------------------------------------------------------------------
// JOIN
// -----------------------------------------------------------------------------
export const JOIN: FunctionDescription = {
  description: "Concatenates elements of arrays with delimiter.",
  args: args`
      delimiter (string) The character or string to place between each concatenated value.
      value_or_array1 (string, range<string>) The value or values to be appended using delimiter.
      value_or_array2 (string, range<string>, optional, repeating) More values to be appended using delimiter.
    `,
  returns: ["STRING"],
  compute: function (delimiter: any, ...values_or_arrays: any): string {
    const _delimiter = toString(delimiter);
    return reduceArgs(
      values_or_arrays,
      (acc, a) => (acc ? acc + _delimiter : "") + toString(a),
      ""
    );
  },
};

// -----------------------------------------------------------------------------
// LEFT
// -----------------------------------------------------------------------------
export const LEFT: FunctionDescription = {
  description: "Substring from beginning of specified string.",
  args: args`
      text (string) The string from which the left portion will be returned.
      number_of_characters (number, optional, default=1) The number of characters to return from the left side of string.
    `,
  returns: ["STRING"],
  compute: function (text: any, number_of_characters: any = 1): string {
    const _numberOfCharacters = toNumber(number_of_characters);
    if (_numberOfCharacters < 0) {
      throw new Error(`
          Function LEFT parameter 2 value is negative. It should be positive or zero.`);
    }
    return toString(text).substring(0, _numberOfCharacters);
  },
};

// -----------------------------------------------------------------------------
// LEN
// -----------------------------------------------------------------------------
export const LEN: FunctionDescription = {
  description: "Length of a string.",
  args: args`
      text (string) The string whose length will be returned.
    `,
  returns: ["NUMBER"],
  compute: function (text: any): number {
    return toString(text).length;
  },
};

// -----------------------------------------------------------------------------
// LOWER
// -----------------------------------------------------------------------------
export const LOWER: FunctionDescription = {
  description: "Converts a specified string to lowercase.",
  args: args`
      text (string) The string to convert to lowercase.
    `,
  returns: ["STRING"],
  compute: function (text: any): string {
    return toString(text).toLowerCase();
  },
};

// -----------------------------------------------------------------------------
// REPLACE
// -----------------------------------------------------------------------------
export const REPLACE: FunctionDescription = {
  description: "Replaces part of a text string with different text.",
  args: args`
      text (string) The text, a part of which will be replaced.
      position (number) The position where the replacement will begin (starting from 1).
      length (number) The number of characters in the text to be replaced.
      new_text (string) The text which will be inserted into the original text.
    `,
  returns: ["STRING"],
  compute: function (text: any, position: any, length: any, new_text: any): string {
    const _position = toNumber(position);
    if (_position < 1) {
      throw new Error(`
        Function REPLACE parameter 2 value is ${_position}. It should be greater than or equal to 1.`);
    }

    const _text = toString(text);
    const _length = toNumber(length);
    const _newText = toString(new_text);
    return _text.substring(0, _position - 1) + _newText + _text.substring(_position - 1 + _length);
  },
};

// -----------------------------------------------------------------------------
// RIGHT
// -----------------------------------------------------------------------------
export const RIGHT: FunctionDescription = {
  description: "A substring from the end of a specified string.",
  args: args`
      text (string) The string from which the right portion will be returned.
      number_of_characters (number, optional, default=1) The number of characters to return from the right side of string.
    `,
  returns: ["STRING"],
  compute: function (text: any, number_of_characters: any = 1): string {
    const _numberOfCharacters = toNumber(number_of_characters);
    if (_numberOfCharacters < 0) {
      throw new Error(`
          Function RIGHT parameter 2 value is negative. It should be positive or zero.`);
    }
    const _text = toString(text);
    const stringLength = _text.length;
    return _text.substring(stringLength - _numberOfCharacters, stringLength);
  },
};

// -----------------------------------------------------------------------------
// SEARCH
// -----------------------------------------------------------------------------
export const SEARCH: FunctionDescription = {
  description: "First position of string found in text, ignoring case.",
  args: args`
      search_for (string) The string to look for within text_to_search.
      text_to_search (string) The text to search for the first occurrence of search_for.
      starting_at (number, optional, default=1 )The character within text_to_search at which to start the search.
    `,
  returns: ["NUMBER"],
  compute: function (search_for: any, text_to_search: any, starting_at: any = 1): number {
    const _textToSearch = toString(text_to_search).toLowerCase();
    if (_textToSearch === "") {
      throw new Error(`
        Function SEARCH parameter 2 value should be non-empty.`);
    }

    const _startingAt = toNumber(starting_at);
    if (_startingAt === 0) {
      throw new Error(`
        Function SEARCH parameter 3 value is 0. It should be greater than or equal to 1.`);
    }

    const _searchFor = toString(search_for).toLowerCase();
    const result = _textToSearch.indexOf(_searchFor, _startingAt - 1);
    if (result < 0) {
      throw new Error(`
        In SEARCH evaluation, cannot find '${_searchFor}' within '${_textToSearch}'.`);
    }
    return result + 1;
  },
};

// -----------------------------------------------------------------------------
// SUBSTITUTE
// -----------------------------------------------------------------------------
export const SUBSTITUTE: FunctionDescription = {
  description: "Replaces existing text with new text in a string.",
  args: args`
      text_to_search (string) The text within which to search and replace.
      search_for (string) The string to search for within text_to_search.
      replace_with (string) The string that will replace search_for.
      occurrence_number (number, optional) The instance of search_for within text_to_search to replace with replace_with. By default, all occurrences of search_for are replaced; however, if occurrence_number is specified, only the indicated instance of search_for is replaced.
    `,
  returns: ["NUMBER"],
  compute: function (
    text_to_search: any,
    search_for: any,
    replace_with: any,
    occurrence_number: any = undefined
  ): string {
    const _occurrenceNumber = toNumber(occurrence_number);
    if (_occurrenceNumber < 0) {
      throw new Error(`
        Function SUBSTITUTE parameter 4 value is negative. It should be positive or zero.`);
    }

    const _textToSearch = toString(text_to_search);
    const _searchFor = toString(search_for);
    if (_searchFor === "") {
      return _textToSearch;
    }

    const _replaceWith = toString(replace_with);
    const reg = new RegExp(_searchFor, "g");
    if (_occurrenceNumber === 0) {
      return _textToSearch.replace(reg, _replaceWith);
    }

    let n = 0;
    return _textToSearch.replace(reg, (text) => (++n === _occurrenceNumber ? _replaceWith : text));
  },
};

// -----------------------------------------------------------------------------
// TEXTJOIN
// -----------------------------------------------------------------------------
export const TEXTJOIN: FunctionDescription = {
  description: "Combines text from multiple strings and/or arrays.",
  args: args`
      delimiter (string) A string, possible empty, or a reference to a valid string. If empty, the text will be simply concatenated.
      ignore_empty (bollean) A boolean; if TRUE, empty cells selected in the text arguments won't be included in the result.
      text1 (string, range<string>) Any text item. This could be a string, or an array of strings in a range.
      text2 (string, range<string>, optional, repeating) Additional text item(s).
    `,
  returns: ["STRING"],
  compute: function (delimiter: any, ignore_empty: any, ...texts_or_arrays: any): string {
    const _delimiter = toString(delimiter);
    const _ignoreEmpty = toBoolean(ignore_empty);
    let n = 0;
    return reduceArgs(
      texts_or_arrays,
      (acc, a) =>
        !(_ignoreEmpty && toString(a) === "") ? (n++ ? acc + _delimiter : "") + toString(a) : acc,
      ""
    );
  },
};

// -----------------------------------------------------------------------------
// TRIM
// -----------------------------------------------------------------------------
export const TRIM: FunctionDescription = {
  description: "Removes space characters.",
  args: args`
      text (string) The text or reference to a cell containing text to be trimmed.
    `,
  returns: ["STRING"],
  compute: function (text: any): string {
    return toString(text).trim();
  },
};

// -----------------------------------------------------------------------------
// UPPER
// -----------------------------------------------------------------------------
export const UPPER: FunctionDescription = {
  description: "Converts a specified string to uppercase.",
  args: args`
      text (string) The string to convert to uppercase.
    `,
  returns: ["STRING"],
  compute: function (text: any): string {
    return toString(text).toUpperCase();
  },
};
