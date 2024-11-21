import { PivotCoreDimension, PivotField, PivotFields } from "../../types";
import { deepCopy } from "../misc";
import { isDateOrDatetimeField } from "./pivot_helpers";

export class GroupableFields {
  constructor(
    private dateGranularities: string[],
    private datetimeGranularities: string[],
    private isGroupable: (field: PivotField) => boolean
  ) {}

  getUnusedGroupableFields(fields: PivotFields, dimensions: PivotCoreDimension[]): PivotField[] {
    const groupableFields: PivotField[] = [];
    for (const fieldName in fields) {
      const field = fields[fieldName];
      if (!field) {
        continue;
      }
      if (this.isGroupable(field)) {
        groupableFields.push(field);
      }
    }
    const currentlyUsed = dimensions.map((field) => field.fieldName);
    const unusedGranularities = this.getUnusedGranularities(fields, dimensions);
    return groupableFields
      .filter((field) => {
        if (isDateOrDatetimeField(field)) {
          return !currentlyUsed.includes(field.name) || unusedGranularities[field.name].size > 0;
        }
        return !currentlyUsed.includes(field.name);
      })
      .sort((a, b) => a.string.localeCompare(b.string));
  }

  getUnusedGranularities(
    fields: PivotFields,
    dimensions: PivotCoreDimension[]
  ): Record<string, Set<string>> {
    const dateFields = dimensions.filter((dimension) => {
      const fieldType = fields[dimension.fieldName]?.type;
      return fieldType === "date" || fieldType === "datetime";
    });
    const granularitiesPerFields = {};
    for (const field of dateFields) {
      granularitiesPerFields[field.fieldName] = new Set(
        fields[field.fieldName]?.type === "date"
          ? this.dateGranularities
          : this.datetimeGranularities
      );
    }
    for (const field of dateFields) {
      granularitiesPerFields[field.fieldName].delete(field.granularity);
    }
    return granularitiesPerFields;
  }

  addDefaultDateTimeGranularity(fields: PivotFields, dimensions: PivotCoreDimension[]) {
    const dimensionsWithGranularity = deepCopy(dimensions);
    const unusedGranularities = this.getUnusedGranularities(fields, dimensions);
    for (const dimension of dimensionsWithGranularity) {
      const fieldType = fields[dimension.fieldName]?.type;
      if ((fieldType === "date" || fieldType === "datetime") && !dimension.granularity) {
        const granularity =
          unusedGranularities[dimension.fieldName]?.values().next().value || "year";
        unusedGranularities[dimension.fieldName]?.delete(granularity);
        dimension.granularity = granularity;
      }
    }
    return dimensionsWithGranularity;
  }
}
