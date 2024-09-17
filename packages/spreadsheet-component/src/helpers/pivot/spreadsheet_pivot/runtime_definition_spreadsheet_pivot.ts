import { Getters, Range } from "../../../types";
import { PivotFields, SpreadsheetPivotCoreDefinition } from "../../../types/pivot";
import { PivotRuntimeDefinition } from "../pivot_runtime_definition";

export class SpreadsheetPivotRuntimeDefinition extends PivotRuntimeDefinition {
  readonly range?: Range;

  constructor(definition: SpreadsheetPivotCoreDefinition, fields: PivotFields, getters: Getters) {
    super(definition, fields);
    if (definition.dataSet) {
      const { sheetId, zone } = definition.dataSet;
      this.range = getters.getRangeFromZone(sheetId, zone);
    }
  }
}
