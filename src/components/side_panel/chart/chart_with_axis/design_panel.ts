import { Component } from "@odoo/owl";
import { getDefinedAxis } from "../../../../helpers/figures/charts";
import { _t } from "../../../../translation";
import {
  ChartWithAxisDefinition,
  DispatchResult,
  SpreadsheetChildEnv,
  UID,
} from "../../../../types/index";
import { ChartTerms } from "../../../translations_terms";
import { Checkbox } from "../../components/checkbox/checkbox";
import { SidePanelCollapsible } from "../../components/collapsible/side_panel_collapsible";
import { Section } from "../../components/section/section";
import {
  AxisDefinition,
  AxisDesignEditor,
} from "../building_blocks/axis_design/axis_design_editor";
import { GeneralDesignEditor } from "../building_blocks/general_design/general_design_editor";
import { GeneralSeriesEditor } from "../building_blocks/general_series/general_series_editor";

interface Props {
  figureId: UID;
  definition: ChartWithAxisDefinition;
  canUpdateChart: (figureID: UID, definition: Partial<ChartWithAxisDefinition>) => DispatchResult;
  updateChart: (figureId: UID, definition: Partial<ChartWithAxisDefinition>) => DispatchResult;
}

export class ChartWithAxisDesignPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ChartWithAxisDesignPanel";
  static components = {
    GeneralDesignEditor,
    GeneralSeriesEditor,
    SidePanelCollapsible,
    Section,
    AxisDesignEditor,
    Checkbox,
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
      axes.push({ id: "y", name: _t("Vertical (left) axis") });
    }
    if (useRightAxis) {
      axes.push({ id: "y1", name: _t("Vertical (right) axis") });
    }
    return axes;
  }

  updateLegendPosition(ev) {
    this.props.updateChart(this.props.figureId, {
      legendPosition: ev.target.value,
    });
  }

  get showValuesLabel(): string {
    return ChartTerms.ShowValues;
  }

  updateShowValues(showValues: boolean) {
    this.props.updateChart(this.props.figureId, { showValues });
  }
}
