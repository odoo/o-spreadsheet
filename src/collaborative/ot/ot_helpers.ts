import { TransformationFunction } from "../../registries";
import { SheetCommand } from "../../types/collaborative/ot_types";

/**
 * Add a check before a transformation. If both commands target different
 * sheets, the transformation will directly return the command to transform
 * unmodified.
 */
export function withSheetCheck<T extends SheetCommand["type"], U extends SheetCommand["type"]>(
  transformation: TransformationFunction<T, U>
) {
  return (
    toTransform: Extract<SheetCommand, { type: T }>,
    executed: Extract<SheetCommand, { type: U }>
  ) => {
    if (toTransform.sheetId !== executed.sheetId) {
      return toTransform;
    }
    return transformation(toTransform, executed);
  };
}
