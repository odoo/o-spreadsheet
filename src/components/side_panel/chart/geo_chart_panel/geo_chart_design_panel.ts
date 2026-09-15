import { ChartHumanizeNumbers } from "../building_blocks/humanize_numbers/humanize_numbers";
import { ChartWithColorScaleDesignPanel } from "../chart_with_colorscale/chart_with_colorscale_design_panel";

export class GeoChartDesignPanel extends ChartWithColorScaleDesignPanel {
  static template = "o-spreadsheet-GeoChartDesignPanel";

  static components = {
    ...ChartWithColorScaleDesignPanel.components,
    ChartHumanizeNumbers,
  };
}
