import { _t } from "../../../../translation";
import { CalendarChartDefinition } from "../../../../types/chart/calendar_chart";
import {
  AxisDefinition,
  AxisDesignEditor,
} from "../building_blocks/axis_design/axis_design_editor";
import { ChartSidePanelProps, chartSidePanelPropsDefinition } from "../common";

import { useProps } from "@odoo/owl";
import { ChartWithColorScaleDesignPanel } from "../chart_with_colorscale/chart_with_colorscale_design_panel";
export class CalendarChartDesignPanel extends ChartWithColorScaleDesignPanel {
  static template = "o-spreadsheet-CalendarChartDesignPanel";
  static components = {
    ...ChartWithColorScaleDesignPanel.components,
    AxisDesignEditor,
  };
  protected props = useProps(chartSidePanelPropsDefinition) as unknown as ChartSidePanelProps<
    CalendarChartDefinition<string>
  >;

  get axesList(): AxisDefinition[] {
    return [
      { id: "x", name: _t("Horizontal axis") },
      { id: "y", name: _t("Vertical axis") },
    ];
  }
}
