import { getFieldDisplayName } from "../../../../helpers/pivot/pivot_helpers";
import { Get } from "../../../../store_engine";
import { SpreadsheetStore } from "../../../../stores";
import { UID } from "../../../../types";

export class PivotCustomFieldStore extends SpreadsheetStore {
  mutators = [] as const;

  constructor(get: Get, private pivotId: UID, private parentField: string) {
    super(get);
  }

  get fields() {
    /// ADRM TODO: all fields no only pivot current dimensions
    const definition = this.getters.getPivot(this.pivotId).definition;
    return [...definition.columns, ...definition.rows].map((f) => ({
      ...f,
      displayName: getFieldDisplayName(f),
    }));
  }

  get allValues() {
    const field = this.fields.find((f) => f.nameWithGranularity === this.parentField);
    if (!field) {
      return [];
    }
    return this.getters.getPivot(this.pivotId).getPossibleFieldValues(field);
  }
}
