import { CommandResult, DispatchResult } from "../../types/commands";
import { UID } from "../../types/misc";

import { Model } from "../..";
import { TableTerms } from "../../components/translations_terms";
import { SpreadsheetChildEnv } from "../../types/spreadsheet_env";
import { TableConfig } from "../../types/table";
import { DEFAULT_TABLE_CONFIG } from "../table_presets";
import { getZoneArea } from "../zones";

/**
 * Create a table on the selected zone, with UI warnings to the user if the creation fails.
 * If a single cell is selected, expand the selection to non-empty adjacent cells to create a table.
 */
export function interactiveCreateTable(
  model: Model,
  env: SpreadsheetChildEnv,
  sheetId: UID,
  tableConfig: TableConfig = DEFAULT_TABLE_CONFIG
): DispatchResult {
  let target = model.getters.getSelectedZones();
  let isDynamic = model.getters.canCreateDynamicTableOnZones(sheetId, target);

  if (target.length === 1 && !isDynamic && getZoneArea(target[0]) === 1) {
    model.selection.selectTableAroundSelection();
    target = model.getters.getSelectedZones();
    isDynamic = model.getters.canCreateDynamicTableOnZones(sheetId, target);
  }

  const ranges = target.map((zone) => model.getters.getRangeDataFromZone(sheetId, zone));
  const result = model.dispatch("CREATE_TABLE", {
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
