import { Component } from "@odoo/owl";
import { DispatchResult, SpreadsheetChildEnv, UID } from "../../../../types";
import { GenericDefinition, PieChartDefinition } from "../../../../types/chart";
import { Section } from "../../components/section/section";
import { GeneralDesignEditor } from "../building_blocks/general_design/general_design_editor";
import { ChartLegend } from "../building_blocks/legend/legend";
import { PieHoleSize } from "../building_blocks/pie_hole_size/pie_hole_size";
import { ChartShowValues } from "../building_blocks/show_values/show_values";

interface Props {
  figureId: UID;
  definition: PieChartDefinition;
  canUpdateChart: (
    figureID: UID,
    definition: GenericDefinition<PieChartDefinition>
  ) => DispatchResult;
  updateChart: (figureId: UID, definition: GenericDefinition<PieChartDefinition>) => DispatchResult;
}

export class PieChartDesignPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PieChartDesignPanel";
  static components = {
    GeneralDesignEditor,
    Section,
    ChartLegend,
    ChartShowValues,
    PieHoleSize,
  };
  static props = {
    figureId: String,
    definition: Object,
    updateChart: Function,
    canUpdateChart: { type: Function, optional: true },
  };

  onPieHoleSizeChange(pieHolePercentage: number) {
    this.props.updateChart(this.props.figureId, {
      ...this.props.definition,
      pieHolePercentage,
    });
  }
}
