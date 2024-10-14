import { Component } from "@odoo/owl";
import { getDefinedAxis } from "../../../../helpers/figures/charts";
import { _t } from "../../../../translation";
import {
  ChartWithDataSetDefinition,
  DispatchResult,
  SpreadsheetChildEnv,
  UID,
} from "../../../../types/index";
import { Checkbox } from "../../components/checkbox/checkbox";
import { SidePanelCollapsible } from "../../components/collapsible/side_panel_collapsible";
import { Section } from "../../components/section/section";
import {
  AxisDefinition,
  AxisDesignEditor,
} from "../building_blocks/axis_design/axis_design_editor";
import { GeneralDesignEditor } from "../building_blocks/general_design/general_design_editor";
import { ChartLegend } from "../building_blocks/legend/legend";
import { SeriesWithAxisDesignEditor } from "../building_blocks/series_design/series_with_axis_design_editor";

interface Props {
  figureId: UID;
  definition: ChartWithDataSetDefinition;
  canUpdateChart: (
    figureID: UID,
    definition: Partial<ChartWithDataSetDefinition>
  ) => DispatchResult;
  updateChart: (figureId: UID, definition: Partial<ChartWithDataSetDefinition>) => DispatchResult;
}

export class ChartWithAxisDesignPanel<P extends Props = Props> extends Component<
  P,
  SpreadsheetChildEnv
> {
  static template = "o-spreadsheet-ChartWithAxisDesignPanel";
  static components = {
    GeneralDesignEditor,
    SidePanelCollapsible,
    Section,
    AxisDesignEditor,
    Checkbox,
    SeriesWithAxisDesignEditor,
    ChartLegend,
  };
  static props = {
    figureId: String,
    definition: Object,
    canUpdateChart: Function,
    updateChart: Function,
  };

  get axesList(): AxisDefinition[] {
    const { useLeftAxis, useRightAxis } = getDefinedAxis(this.props.definition);
    let axes: AxisDefinition[] = [{ id: "x", name: _t("Horizontal axis") }];
    if (useLeftAxis) {
      axes.push({ id: "y", name: useRightAxis ? _t("Left axis") : _t("Vertical axis") });
    }
    if (useRightAxis) {
      axes.push({ id: "y1", name: useLeftAxis ? _t("Right axis") : _t("Vertical axis") });
    }
    return axes;
  }

  updateLegendPosition(ev) {
    this.props.updateChart(this.props.figureId, {
      legendPosition: ev.target.value,
    });
  }
}
