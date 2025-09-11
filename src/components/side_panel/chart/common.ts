import { ChartDefinition, DispatchResult, UID } from "../../..";

export interface ChartSidePanelProps<T extends ChartDefinition> {
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
