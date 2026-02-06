import { markdownLink } from "../helpers/misc";
import { _t } from "../translation";
import { AddFunctionDescription } from "../types/functions";
import { FunctionResultObject, Maybe } from "../types/misc";
import { arg } from "./arguments";
import { toString } from "./helpers";

// -----------------------------------------------------------------------------
// HYPERLINK
// -----------------------------------------------------------------------------
export const HYPERLINK = {
  description: _t("Creates a hyperlink in a cell."),
  args: [
    arg("url (string)", _t("The full URL of the link enclosed in quotation marks.")),
    arg(
      "link_label (string, optional)",
      _t("The text to display in the cell, enclosed in quotation marks.")
    ),
  ],
  compute: function (url: Maybe<FunctionResultObject>, linkLabel: Maybe<FunctionResultObject>) {
    const processedUrl = toString(url).trim();
    const processedLabel = toString(linkLabel) || processedUrl;
    if (processedUrl === "") {
      return { value: processedLabel };
    }
    return { value: markdownLink(processedLabel, processedUrl) };
  },
  isExported: true,
} satisfies AddFunctionDescription;
