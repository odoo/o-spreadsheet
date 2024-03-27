import { Getters } from "../../types";
import { SpreadsheetPivotCoreDefinition } from "../../types/pivot";

export class SpreadsheetCorePivot {
  constructor(definition: SpreadsheetPivotCoreDefinition, getters: Getters) {
    // do stuff
    // Convert definition.range string > RangeImpl
    // + columns, rows, columns, rows
  }

  adaptRange() {
    // do stuff
  }

  export() {
    return this;
  }
}
