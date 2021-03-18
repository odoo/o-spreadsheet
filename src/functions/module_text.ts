import { _lt } from "../translation";
import { AddFunctionDescription } from "../types";
import { args } from "./arguments";
import { reduceArgs, toBoolean, toNumber, toString } from "./helpers";

// -----------------------------------------------------------------------------
// CHAR
// -----------------------------------------------------------------------------
export const CHAR: AddFunctionDescription = {
  description: _lt("Gets character associated with number."),
  args: args(`
      table_number (number) ${_lt(
        "The number of the character to look up from the current Unicode table in decimal format."
      )}
  `),
  returns: ["STRING"],
  compute: function (tableNumber: any): string {
    const _tableNumber = Math.trunc(toNumber(tableNumber));
    if (_tableNumber < 1) {
      throw new Error(
        _lt(
          "Function [[FUNCTION_NAME]] parameter 1 value %s is out of range.",
          _tableNumber.toString()
        )
      );
    }
    return String.fromCharCode(_tableNumber);
  },
};

// -----------------------------------------------------------------------------
// CONCATENATE
// -----------------------------------------------------------------------------
export const CONCATENATE: AddFunctionDescription = {
  description: _lt("Appends strings to one another."),
  args: args(`
      string1 (string, range<string>) ${_lt("The initial string.")}
      string2 (string, range<string>, repeating) ${_lt("More strings to append in sequence.")}
  `),
  returns: ["STRING"],
  compute: function (): string {
    return reduceArgs(arguments, (acc, a) => acc + toString(a), "");
  },
};

// -----------------------------------------------------------------------------
// EXACT
// -----------------------------------------------------------------------------
export const EXACT: AddFunctionDescription = {
  description: _lt("Tests whether two strings are identical."),
  args: args(`
      string1 (string) ${_lt("The first string to compare.")}
      string2 (string) ${_lt("The second string to compare.")}
  `),
  returns: ["BOOLEAN"],
  compute: function (string1: any, string2: any): boolean {
    return toString(string1) === toString(string2);
  },
};

// -----------------------------------------------------------------------------
// FIND
// -----------------------------------------------------------------------------
export const FIND: AddFunctionDescription = {
  description: _lt("First position of string found in text, case-sensitive."),
  args: args(`
      search_for (string) ${_lt("The string to look for within text_to_search.")}
      text_to_search (string) ${_lt("The text to search for the first occurrence of search_for.")}
      starting_at (number, default=1 ) ${_lt(
        "The character within text_to_search at which to start the search."
      )}
  `),
  returns: ["NUMBER"],
  compute: function (searchFor: any, textToSearch: any, startingAt: any = 1): number {
    const _textToSearch = toString(textToSearch);
    if (_textToSearch === "") {
      throw new Error(_lt(`Function [[FUNCTION_NAME]] parameter 2 value should be non-empty.`));
    }

    const _startingAt = toNumber(startingAt);
    if (_startingAt === 0) {
      throw new Error(
        _lt(
          `Function [[FUNCTION_NAME]] parameter 3 value is 0. It should be greater than or equal to 1.`
        )
      );
    }

    const _searchFor = toString(searchFor);
    const result = _textToSearch.indexOf(_searchFor, _startingAt - 1);
    if (result < 0) {
      throw new Error(
        _lt(
          "In [[FUNCTION_NAME]] evaluation, cannot find '%s' within '%s'.",
          _searchFor.toString(),
          _textToSearch
        )
      );
    }
    return result + 1;
  },
};

// -----------------------------------------------------------------------------
// JOIN
// -----------------------------------------------------------------------------
export const JOIN: AddFunctionDescription = {
  description: _lt("Concatenates elements of arrays with delimiter."),
  args: args(`
      delimiter (string) ${_lt("The character or string to place between each concatenated value.")}
      value_or_array1 (string, range<string>) ${_lt(
        "The value or values to be appended using delimiter."
      )}
      value_or_array2 (string, range<string>, repeating) ${_lt(
        "More values to be appended using delimiter."
      )}
  `),
  returns: ["STRING"],
  compute: function (delimiter: any, ...valuesOrArrays: any): string {
    const _delimiter = toString(delimiter);
    return reduceArgs(valuesOrArrays, (acc, a) => (acc ? acc + _delimiter : "") + toString(a), "");
  },
};

// -----------------------------------------------------------------------------
// LEFT
// -----------------------------------------------------------------------------
export const LEFT: AddFunctionDescription = {
  description: _lt("Substring from beginning of specified string."),
  args: args(`
      text (string) ${_lt("The string from which the left portion will be returned.")}
      number_of_characters (number, default=1) ${_lt(
        "The number of characters to return from the left side of string."
      )}
  `),
  returns: ["STRING"],
  compute: function (text: any, numberOfCharacters: any = 1): string {
    const _numberOfCharacters = toNumber(numberOfCharacters);
    if (_numberOfCharacters < 0) {
      throw new Error(
        _lt(
          `Function [[FUNCTION_NAME]] parameter 2 value is negative. It should be positive or zero.`
        )
      );
    }
    return toString(text).substring(0, _numberOfCharacters);
  },
};

// -----------------------------------------------------------------------------
// LEN
// -----------------------------------------------------------------------------
export const LEN: AddFunctionDescription = {
  description: _lt("Length of a string."),
  args: args(`
      text (string) ${_lt("The string whose length will be returned.")}
  `),
  returns: ["NUMBER"],
  compute: function (text: any): number {
    return toString(text).length;
  },
};

// -----------------------------------------------------------------------------
// LOWER
// -----------------------------------------------------------------------------
export const LOWER: AddFunctionDescription = {
  description: _lt("Converts a specified string to lowercase."),
  args: args(`
      text (string) ${_lt("The string to convert to lowercase.")}
  `),
  returns: ["STRING"],
  compute: function (text: any): string {
    return toString(text).toLowerCase();
  },
};

// -----------------------------------------------------------------------------
// REPLACE
// -----------------------------------------------------------------------------
export const REPLACE: AddFunctionDescription = {
  description: _lt("Replaces part of a text string with different text."),
  args: args(`
      text (string) ${_lt("The text, a part of which will be replaced.")}
      position (number) ${_lt("The position where the replacement will begin (starting from 1).")}
      length (number) ${_lt("The number of characters in the text to be replaced.")}
      new_text (string) ${_lt("The text which will be inserted into the original text.")}
  `),
  returns: ["STRING"],
  compute: function (text: any, position: any, length: any, newText: any): string {
    const _position = toNumber(position);
    if (_position < 1) {
      throw new Error(
        _lt(
          `Function [[FUNCTION_NAME]] parameter 2 value is ${_position}. It should be greater than or equal to 1.`
        )
      );
    }

    const _text = toString(text);
    const _length = toNumber(length);
    const _newText = toString(newText);
    return _text.substring(0, _position - 1) + _newText + _text.substring(_position - 1 + _length);
  },
};

// -----------------------------------------------------------------------------
// RIGHT
// -----------------------------------------------------------------------------
export const RIGHT: AddFunctionDescription = {
  description: _lt("A substring from the end of a specified string."),
  args: args(`
      text (string) ${_lt("The string from which the right portion will be returned.")}
      number_of_characters (number, default=1) ${_lt(
        "The number of characters to return from the right side of string."
      )}
  `),
  returns: ["STRING"],
  compute: function (text: any, numberOfCharacters: any = 1): string {
    const _numberOfCharacters = toNumber(numberOfCharacters);
    if (_numberOfCharacters < 0) {
      throw new Error(
        _lt(
          `Function [[FUNCTION_NAME]] parameter 2 value is negative. It should be positive or zero.`
        )
      );
    }
    const _text = toString(text);
    const stringLength = _text.length;
    return _text.substring(stringLength - _numberOfCharacters, stringLength);
  },
};

// -----------------------------------------------------------------------------
// SEARCH
// -----------------------------------------------------------------------------
export const SEARCH: AddFunctionDescription = {
  description: _lt("First position of string found in text, ignoring case."),
  args: args(`
      search_for (string) ${_lt("The string to look for within text_to_search.")}
      text_to_search (string) ${_lt("The text to search for the first occurrence of search_for.")}
      starting_at (number, default=1 ) ${_lt(
        "The character within text_to_search at which to start the search."
      )}
  `),
  returns: ["NUMBER"],
  compute: function (searchFor: any, textToDearch: any, startingAt: any = 1): number {
    const _textToSearch = toString(textToDearch).toLowerCase();
    if (_textToSearch === "") {
      throw new Error(_lt(`Function [[FUNCTION_NAME]] parameter 2 value should be non-empty.`));
    }

    const _startingAt = toNumber(startingAt);
    if (_startingAt === 0) {
      throw new Error(
        _lt(
          `Function [[FUNCTION_NAME]] parameter 3 value is 0. It should be greater than or equal to 1.`
        )
      );
    }

    const _searchFor = toString(searchFor).toLowerCase();
    const result = _textToSearch.indexOf(_searchFor, _startingAt - 1);
    if (result < 0) {
      throw new Error(
        _lt(
          "In [[FUNCTION_NAME]] evaluation, cannot find '%s' within '%s'.",
          _searchFor,
          _textToSearch
        )
      );
    }
    return result + 1;
  },
};

// -----------------------------------------------------------------------------
// SUBSTITUTE
// -----------------------------------------------------------------------------
export const SUBSTITUTE: AddFunctionDescription = {
  description: _lt("Replaces existing text with new text in a string."),
  args: args(`
      text_to_search (string) ${_lt("The text within which to search and replace.")}
      search_for (string) ${_lt("The string to search for within text_to_search.")}
      replace_with (string) ${_lt("The string that will replace search_for.")}
      occurrence_number (number, optional) ${_lt(
        "The instance of search_for within text_to_search to replace with replace_with. By default, all occurrences of search_for are replaced; however, if occurrence_number is specified, only the indicated instance of search_for is replaced."
      )}
  `),
  returns: ["NUMBER"],
  compute: function (
    textToSearch: any,
    searchFor: any,
    replaceWith: any,
    occurrenceNumber: any = undefined
  ): string {
    const _occurrenceNumber = toNumber(occurrenceNumber);
    if (_occurrenceNumber < 0) {
      throw new Error(
        _lt(
          `Function [[FUNCTION_NAME]] parameter 4 value is negative. It should be positive or zero.`
        )
      );
    }

    const _textToSearch = toString(textToSearch);
    const _searchFor = toString(searchFor);
    if (_searchFor === "") {
      return _textToSearch;
    }

    const _replaceWith = toString(replaceWith);
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
export const TEXTJOIN: AddFunctionDescription = {
  description: _lt("Combines text from multiple strings and/or arrays."),
  args: args(`
      delimiter (string) ${_lt(
        " A string, possible empty, or a reference to a valid string. If empty, the text will be simply concatenated."
      )}
      ignore_empty (bollean) ${_lt(
        "A boolean; if TRUE, empty cells selected in the text arguments won't be included in the result."
      )}
      text1 (string, range<string>) ${_lt(
        "Any text item. This could be a string, or an array of strings in a range."
      )}
      text2 (string, range<string>, repeating) ${_lt("Additional text item(s).")}
  `),
  returns: ["STRING"],
  compute: function (delimiter: any, ignoreEmpty: any, ...textsOrArrays: any): string {
    const _delimiter = toString(delimiter);
    const _ignoreEmpty = toBoolean(ignoreEmpty);
    let n = 0;
    return reduceArgs(
      textsOrArrays,
      (acc, a) =>
        !(_ignoreEmpty && toString(a) === "") ? (n++ ? acc + _delimiter : "") + toString(a) : acc,
      ""
    );
  },
};

// -----------------------------------------------------------------------------
// TRIM
// -----------------------------------------------------------------------------
export const TRIM: AddFunctionDescription = {
  description: _lt("Removes space characters."),
  args: args(`
      text (string) ${_lt("The text or reference to a cell containing text to be trimmed.")}
  `),
  returns: ["STRING"],
  compute: function (text: any): string {
    return toString(text).trim();
  },
};

// -----------------------------------------------------------------------------
// UPPER
// -----------------------------------------------------------------------------
export const UPPER: AddFunctionDescription = {
  description: _lt("Converts a specified string to uppercase."),
  args: args(`
      text (string) ${_lt("The string to convert to uppercase.")}
  `),
  returns: ["STRING"],
  compute: function (text: any): string {
    return toString(text).toUpperCase();
  },
};
