import { ChartDatasetOrientation, ChartDefinition, DispatchResult, UID } from "../../..";
import { isXcRepresentation, toUnboundedZone } from "../../../helpers";

export interface ChartSidePanelProps<T extends ChartDefinition<string>> {
  chartId: UID;
  definition: T;
  canUpdateChart: (chartId: UID, definition: Partial<T>) => DispatchResult;
  updateChart: (chartId: UID, definition: Partial<T>) => DispatchResult;
}

export const ChartSidePanelPropsObject = {
  chartId: String,
  definition: Object,
  canUpdateChart: Function,
  updateChart: Function,
};

export function computeRangeOrientation(
  range: string | undefined
): ChartDatasetOrientation | undefined {
  if (!range || !isXcRepresentation(range)) {
    return undefined;
  }
  const zone = toUnboundedZone(range);
  if (zone.bottom === undefined || zone.right === undefined) {
    return undefined;
  }
  if (zone.top === zone.bottom) {
    return "rows";
  }
  if (zone.left === zone.right) {
    return "columns";
  }
  return undefined;
}
