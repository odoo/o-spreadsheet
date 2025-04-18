import { Component } from "@odoo/owl";
import { clip } from "../../../../helpers";
import { DispatchResult, SpreadsheetChildEnv, UID } from "../../../../types";
import { GenericDefinition, PieChartDefinition } from "../../../../types/chart";
import { Checkbox } from "../../components/checkbox/checkbox";
import { Section } from "../../components/section/section";
import { GeneralDesignEditor } from "../building_blocks/general_design/general_design_editor";
import { ChartLegend } from "../building_blocks/legend/legend";
import { PieHoleSize } from "../building_blocks/pie_hole_size/pie_hole_size";

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
    Checkbox,
    ChartLegend,
    PieHoleSize,
  };
  static props = {
    figureId: String,
    definition: Object,
    updateChart: Function,
    canUpdateChart: { type: Function, optional: true },
  };

  onPieHoleSizeChange(doughnutPercentage: string) {
    const numericValue = parseFloat(doughnutPercentage);
    if (!isNaN(numericValue)) {
      this.props.updateChart(this.props.figureId, {
        ...this.props.definition,
        doughnutPercentage: clip(numericValue, 0, 95),
      });
    }
  }
}
