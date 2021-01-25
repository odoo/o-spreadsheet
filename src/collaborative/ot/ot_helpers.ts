import { TransformationFunction } from "../../registries";
import { SheetyCommand } from "../../types/ot_types";

/**
 * Add a check before a transformation. If both commands target different
 * sheets, the transformation will directly return the command to transform
 * unmodified.
 */
export function withSheetCheck<T extends SheetyCommand["type"], U extends SheetyCommand["type"]>(
  transformation: TransformationFunction<T, U>
) {
  return (
    toTransform: Extract<SheetyCommand, { type: T }>,
    executed: Extract<SheetyCommand, { type: U }>
  ) => {
    if (toTransform.sheetId !== executed.sheetId) {
      return toTransform;
    }
    return transformation(toTransform, executed);
  };
}
