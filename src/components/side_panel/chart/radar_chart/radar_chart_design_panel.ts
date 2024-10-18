import { Component } from "@odoo/owl";
import { RadarChartDefinition } from "../../../../types/chart/radar_chart";
import {
  DispatchResult,
  GenericDefinition,
  SpreadsheetChildEnv,
  UID,
} from "../../../../types/index";
import { Checkbox } from "../../components/checkbox/checkbox";
import { Section } from "../../components/section/section";
import { GeneralDesignEditor } from "../building_blocks/general_design/general_design_editor";
import { ChartLegend } from "../building_blocks/legend/legend";
import { SeriesDesignEditor } from "../building_blocks/series_design/series_design_editor";

interface Props {
  figureId: UID;
  definition: RadarChartDefinition;
  canUpdateChart: (
    figureID: UID,
    definition: GenericDefinition<RadarChartDefinition>
  ) => DispatchResult;
  updateChart: (
    figureId: UID,
    definition: GenericDefinition<RadarChartDefinition>
  ) => DispatchResult;
}

export class RadarChartDesignPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-RadarChartDesignPanel";
  static components = {
    GeneralDesignEditor,
    SeriesDesignEditor,
    Section,
    Checkbox,
    ChartLegend,
  };
  static props = {
    figureId: String,
    definition: Object,
    canUpdateChart: Function,
    updateChart: Function,
  };
}
