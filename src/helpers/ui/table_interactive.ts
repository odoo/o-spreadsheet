import { TableTerms } from "../../components/translations_terms";
import { CommandResult, DispatchResult, SpreadsheetChildEnv, UID } from "../../types";
import { TableConfig } from "../../types/table";
import { getZoneArea } from "../zones";

/**
 * Create a table on the selected zone, with UI warnings to the user if the creation fails.
 * If a single cell is selected, expand the selection to non-empty adjacent cells to create a table.
 */
export function interactiveCreateTable(
  env: SpreadsheetChildEnv,
  sheetId: UID,
  tableConfig?: TableConfig
): DispatchResult {
  const selection = env.model.getters.getSelectedZones();
  if (selection.length === 1 && getZoneArea(selection[0]) === 1) {
    env.model.selection.selectTableAroundSelection();
  }
  const target = env.model.getters.getSelectedZones();
  const ranges = target.map((zone) => env.model.getters.getRangeDataFromZone(sheetId, zone));

  const result = env.model.dispatch("CREATE_TABLE", { ranges, sheetId, config: tableConfig });
  if (result.isCancelledBecause(CommandResult.TableOverlap)) {
    env.raiseError(TableTerms.Errors.TableOverlap);
  } else if (result.isCancelledBecause(CommandResult.NonContinuousTargets)) {
    env.raiseError(TableTerms.Errors.NonContinuousTargets);
  }
  return result;
}
