import { Component } from "@odoo/owl";
import { getDefinedAxis } from "../../../../helpers/figures/charts";
import { _t } from "../../../../translation";
import { ChartWithDataSetDefinition, SpreadsheetChildEnv } from "../../../../types/index";
import { SidePanelCollapsible } from "../../components/collapsible/side_panel_collapsible";
import { Section } from "../../components/section/section";
import {
  AxisDefinition,
  AxisDesignEditor,
} from "../building_blocks/axis_design/axis_design_editor";
import { GeneralDesignEditor } from "../building_blocks/general_design/general_design_editor";
import { ChartHumanizeNumbers } from "../building_blocks/humanize_numbers/humanize_numbers";
import { ChartLegend } from "../building_blocks/legend/legend";
import { SeriesWithAxisDesignEditor } from "../building_blocks/series_design/series_with_axis_design_editor";
import { ChartShowValues } from "../building_blocks/show_values/show_values";
import { ChartSidePanelProps, ChartSidePanelPropsObject } from "../common";

export class ChartWithAxisDesignPanel<
  P extends ChartSidePanelProps<ChartWithDataSetDefinition>
> extends Component<P, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ChartWithAxisDesignPanel";
  static components = {
    GeneralDesignEditor,
    SidePanelCollapsible,
    Section,
    AxisDesignEditor,
    SeriesWithAxisDesignEditor,
    ChartLegend,
    ChartShowValues,
    ChartHumanizeNumbers,
  };
  static props = ChartSidePanelPropsObject;

  get axesList(): AxisDefinition[] {
    const { useLeftAxis, useRightAxis } = getDefinedAxis(this.props.definition);
    const axes: AxisDefinition[] = [{ id: "x", name: _t("Horizontal axis") }];
    if (useLeftAxis) {
      axes.push({ id: "y", name: useRightAxis ? _t("Left axis") : _t("Vertical axis") });
    }
    if (useRightAxis) {
      axes.push({ id: "y1", name: useLeftAxis ? _t("Right axis") : _t("Vertical axis") });
    }
    return axes;
  }
}
