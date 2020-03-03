import { ConditionalFormat, Workbook } from "./types";
import { updateState } from "./history";
import { computeStyles } from "./evaluation";

/**
 * Add or replace a conditional formatting on the current sheet
 *
 * @param state Workbook
 * @param cf ConditionalFormat to add or replace
 * @param replaces ConditionalFormat that will be replaced if set
 */
export function addConditionalFormat(
  state: Workbook,
  cf: ConditionalFormat,
  replaces: ConditionalFormat | undefined = undefined
) {
  const currentCF = state.activeSheet.conditionalFormats.slice();
  if (replaces) {
    const replaceIndex = currentCF.indexOf(replaces);
    currentCF.splice(replaceIndex, 1, cf);
  } else {
    currentCF.push(cf);
  }
  updateState(state, ["activeSheet", "conditionalFormats"], currentCF);
  computeStyles(state);
}
