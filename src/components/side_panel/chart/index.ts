import { Component } from "@odoo/owl";
import { Registry } from "../../../registries/registry";
import { BarConfigPanel } from "./bar_chart/bar_chart_config_panel";
import { GenericChartConfigPanel } from "./building_blocks/generic_side_panel/config_panel";
import { GenericChartDesignPanel } from "./building_blocks/generic_side_panel/design_panel";
import { GaugeChartConfigPanel } from "./gauge_chart_panel/gauge_chart_config_panel";
import { GaugeChartDesignPanel } from "./gauge_chart_panel/gauge_chart_design_panel";
import { LineConfigPanel } from "./line_chart/line_chart_config_panel";
import { PieChartDesignPanel } from "./pie_chart/pie_chart_design_panel";
import { ScatterConfigPanel } from "./scatter_chart/scatter_chart_config_panel";
import { ScorecardChartConfigPanel } from "./scorecard_chart_panel/scorecard_chart_config_panel";
import { ScorecardChartDesignPanel } from "./scorecard_chart_panel/scorecard_chart_design_panel";
import { WaterfallChartDesignPanel } from "./waterfall_chart/waterfall_chart_design_panel";

export { BarConfigPanel } from "./bar_chart/bar_chart_config_panel";
export { GenericChartConfigPanel } from "./building_blocks/generic_side_panel/config_panel";
export { GenericChartDesignPanel } from "./building_blocks/generic_side_panel/design_panel";
export { GaugeChartConfigPanel } from "./gauge_chart_panel/gauge_chart_config_panel";
export { GaugeChartDesignPanel } from "./gauge_chart_panel/gauge_chart_design_panel";
export { LineConfigPanel } from "./line_chart/line_chart_config_panel";
export { ScorecardChartConfigPanel } from "./scorecard_chart_panel/scorecard_chart_config_panel";
export { ScorecardChartDesignPanel } from "./scorecard_chart_panel/scorecard_chart_design_panel";

export interface ChartSidePanel {
  configuration: new (...args: any) => Component;
  design: new (...args: any) => Component;
}

export const chartSidePanelComponentRegistry = new Registry<ChartSidePanel>();

chartSidePanelComponentRegistry
  .add("line", {
    configuration: LineConfigPanel,
    design: GenericChartDesignPanel,
  })
  .add("scatter", {
    configuration: ScatterConfigPanel,
    design: GenericChartDesignPanel,
  })
  .add("bar", {
    configuration: BarConfigPanel,
    design: GenericChartDesignPanel,
  })
  .add("combo", {
    configuration: GenericChartConfigPanel,
    design: GenericChartDesignPanel,
  })
  .add("pie", {
    configuration: GenericChartConfigPanel,
    design: PieChartDesignPanel,
  })
  .add("gauge", {
    configuration: GaugeChartConfigPanel,
    design: GaugeChartDesignPanel,
  })
  .add("scorecard", {
    configuration: ScorecardChartConfigPanel,
    design: ScorecardChartDesignPanel,
  })
  .add("waterfall", {
    configuration: GenericChartConfigPanel,
    design: WaterfallChartDesignPanel,
  });
