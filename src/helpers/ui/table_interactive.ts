import { CommandResult, DispatchResult, SpreadsheetChildEnv, UID } from "../../types";

import { TableTerms } from "../../components/translations_terms";
import { TableConfig } from "../../types/table";
import { DEFAULT_TABLE_CONFIG } from "../table_presets";
import { getZoneArea } from "../zones";

/**
 * Create a table on the selected zone, with UI warnings to the user if the creation fails.
 * If a single cell is selected, expand the selection to non-empty adjacent cells to create a table.
 */
export function interactiveCreateTable(
  env: SpreadsheetChildEnv,
  sheetId: UID,
  tableConfig: TableConfig = DEFAULT_TABLE_CONFIG
): DispatchResult {
  let target = env.model.getters.getSelectedZones();
  let isDynamic = env.model.getters.canCreateDynamicTableOnZones(sheetId, target);

  if (target.length === 1 && !isDynamic && getZoneArea(target[0]) === 1) {
    env.model.selection.selectTableAroundSelection();
    target = env.model.getters.getSelectedZones();
    isDynamic = env.model.getters.canCreateDynamicTableOnZones(sheetId, target);
  }

  const ranges = target.map((zone) => env.model.getters.getRangeDataFromZone(sheetId, zone));
  const result = env.model.dispatch("CREATE_TABLE", {
    ranges,
    sheetId,
    config: tableConfig,
    tableType: isDynamic ? "dynamic" : "static",
  });
  if (result.isCancelledBecause(CommandResult.TableOverlap)) {
    env.raiseError(TableTerms.Errors.TableOverlap);
  } else if (result.isCancelledBecause(CommandResult.NonContinuousTargets)) {
    env.raiseError(TableTerms.Errors.NonContinuousTargets);
  }
  return result;
}
