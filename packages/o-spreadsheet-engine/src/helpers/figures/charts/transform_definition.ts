import { chartRegistry } from "../../../registries/chart_registry";
import { ChartDefinition } from "../../../types/chart";
import { RangeAdapter, UID } from "../../../types/misc";

/**
 * Get a new chart definition transformed with the executed command. This
 * functions will be called during operational transform process
 */
export function transformDefinition(
  chartSheetId: UID,
  definition: ChartDefinition,
  applyrange: RangeAdapter
): ChartDefinition {
  const transformation = chartRegistry.getAll().find((factory) => factory.match(definition.type));
  if (!transformation) {
    throw new Error("Unknown chart type.");
  }
  return transformation.transformDefinition(chartSheetId, definition, applyrange);
}
