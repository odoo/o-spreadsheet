import { ChartDefinition } from "../../../types/chart";

export abstract class AbstractChart {
  static commonKeys: readonly (keyof ChartDefinition)[] = [
    "type",
    "title",
    "background",
    "humanize",
  ];
}
