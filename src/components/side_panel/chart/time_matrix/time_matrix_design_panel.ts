import { Component } from "@odoo/owl";
import { _t } from "../../../../translation";
import { TimeMatrixChartDefinition } from "../../../../types/chart/time_matrix_chart";
import { DispatchResult, SpreadsheetChildEnv, UID } from "../../../../types/index";
import { SidePanelCollapsible } from "../../components/collapsible/side_panel_collapsible";
import { Section } from "../../components/section/section";
import {
  AxisDefinition,
  AxisDesignEditor,
} from "../building_blocks/axis_design/axis_design_editor";
import { ColorScalePicker } from "../building_blocks/color_scale/color_scale_picker";
import { GeneralDesignEditor } from "../building_blocks/general_design/general_design_editor";
import { ChartLegend } from "../building_blocks/legend/legend";
import { ChartShowValues } from "../building_blocks/show_values/show_values";

interface Props {
  figureId: UID;
  definition: TimeMatrixChartDefinition;
  canUpdateChart: (figureID: UID, definition: Partial<TimeMatrixChartDefinition>) => DispatchResult;
  updateChart: (figureId: UID, definition: Partial<TimeMatrixChartDefinition>) => DispatchResult;
}

export class TimeMatrixChartDesignPanel<P extends Props = Props> extends Component<
  P,
  SpreadsheetChildEnv
> {
  static template = "o-spreadsheet-TimeMatrixChartDesignPanel";
  static components = {
    GeneralDesignEditor,
    SidePanelCollapsible,
    Section,
    AxisDesignEditor,
    ChartLegend,
    ChartShowValues,
    ColorScalePicker,
  };
  static props = {
    figureId: String,
    definition: Object,
    canUpdateChart: Function,
    updateChart: Function,
  };

  get axesList(): AxisDefinition[] {
    return [
      { id: "x", name: _t("Horizontal axis") },
      { id: "y", name: _t("Vertical axis") },
    ];
  }

  onColormapChange(colorScale): void {
    this.props.updateChart(this.props.figureId, {
      colorScale,
    });
  }
}
