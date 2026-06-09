import { ChartDefinition } from "../../../types/chart/chart";
import { DispatchResult } from "../../../types/commands";
import { UID } from "../../../types/misc";
import { types } from "../../props_validation";

export interface ChartSidePanelProps<T extends ChartDefinition<string>> {
  chartId: UID;
  definition: T;
  canUpdateChart: (chartId: UID, definition: Partial<T>) => DispatchResult;
  updateChart: (chartId: UID, definition: Partial<T>) => DispatchResult;
}

export type ChartUpdateFunction<T extends ChartDefinition<string> = ChartDefinition<string>> = (
  chartId: UID,
  definition: Partial<T>
) => DispatchResult;

export const chartSidePanelPropsDefinition = {
  chartId: types.UID(),
  definition: types.object({}),
  canUpdateChart: types.function<ChartUpdateFunction>(),
  updateChart: types.function<ChartUpdateFunction>(),
};
