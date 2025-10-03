import { arg } from "@odoo/o-spreadsheet-engine/functions/arguments";
import { toString } from "@odoo/o-spreadsheet-engine/functions/helpers";
import { _t } from "@odoo/o-spreadsheet-engine/translation";
import { markdownLink } from "../helpers";
import { AddFunctionDescription, FunctionResultObject, Maybe } from "../types";

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
  compute: function (
    url: Maybe<FunctionResultObject>,
    linkLabel: Maybe<FunctionResultObject>
  ): string {
    const processedUrl = toString(url).trim();
    const processedLabel = toString(linkLabel) || processedUrl;
    if (processedUrl === "") return processedLabel;
    return markdownLink(processedLabel, processedUrl);
  },
  isExported: true,
} satisfies AddFunctionDescription;
