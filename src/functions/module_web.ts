import { markdownLink } from "../helpers";
import { _lt } from "../translation";
import { AddFunctionDescription, PrimitiveArgValue } from "../types";
import { args } from "./arguments";
import { toString } from "./helpers";

// -----------------------------------------------------------------------------
// HYPERLINK
// -----------------------------------------------------------------------------
export const HYPERLINK: AddFunctionDescription = {
  description: _lt("Creates a hyperlink inside a cell."),
  args: args(`
        url (string) ${_lt(
          "The full URL of the link location enclosed in quotation marks, or a reference to a cell containing such a URL."
        )}
        link_label (string, optional) ${_lt(
          "The text to display in the cell as the link, enclosed in quotation marks, or a reference to a cell containing such a label."
        )}
    `),
  returns: ["STRING"],
  compute: function (url: PrimitiveArgValue, linkLabel: PrimitiveArgValue | undefined): string {
    const _url = toString(url);
    let _linkLabel: string;
    if (linkLabel === undefined || linkLabel === null) {
      _linkLabel = _url;
    } else {
      _linkLabel = toString(linkLabel);
    }
    return markdownLink(_linkLabel, _url);
  },
  isExported: true,
};
