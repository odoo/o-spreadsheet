import { _t } from "../translation";
import { ChartDefinition, ChartType } from "./chart";

export const chartCategories = {
  line: _t("Line"),
  column: _t("Column"),
  bar: _t("Bar"),
  area: _t("Area"),
  pie: _t("Pie"),
  hierarchical: _t("Hierarchical"),
  misc: _t("Miscellaneous"),
};
type ChartUICategory = keyof typeof chartCategories;

export interface ChartSubtypeProperties {
  /** Type shown in the chart side panel */
  chartSubtype: string;
  /** Translated name of the displayType */
  displayName: string;
  /** Type of the chart in the model */
  chartType: ChartType;
  /** Match the chart type with a chart display type. Optional if chartType === displayType  */
  matcher?: (definition: ChartDefinition) => boolean;
  /** Additional definition options to create a chart of type displayType */
  subtypeDefinition?: Partial<ChartDefinition>;
  category: ChartUICategory;
  preview: string;
}
