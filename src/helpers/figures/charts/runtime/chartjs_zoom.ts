import { GenericDefinition } from "../../../../types";
import { ChartRuntimeGenerationArgs, ScatterChartDefinition } from "../../../../types/chart";

export function getChartZoom(
  definition: GenericDefinition<ScatterChartDefinition>,
  args: ChartRuntimeGenerationArgs
) {
  if (!("zoom" in definition)) {
    return undefined;
  }
  const { zoom } = definition;
  if (!zoom?.enabled) {
    return undefined;
  }
  const { axisType } = args;
  return {
    ...zoom,
    wheelable: axisType === "linear",
  };
}
