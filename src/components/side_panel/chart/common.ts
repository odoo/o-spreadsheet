import { ChartDefinition } from "../../../types/chart/chart";
import { DispatchResult } from "../../../types/commands";
import { UID } from "../../../types/misc";

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
