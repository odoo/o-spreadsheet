import { RadarChartDefinition } from "@odoo/o-spreadsheet-engine/types/chart/radar_chart";
import { Component } from "@odoo/owl";
import {
  DispatchResult,
  GenericDefinition,
  SpreadsheetChildEnv,
  UID,
} from "../../../../types/index";
import { Checkbox } from "../../components/checkbox/checkbox";
import { Section } from "../../components/section/section";
import { GeneralDesignEditor } from "../building_blocks/general_design/general_design_editor";
import { ChartHumanizeNumbers } from "../building_blocks/humanize_numbers/humanize_numbers";
import { ChartLegend } from "../building_blocks/legend/legend";
import { SeriesDesignEditor } from "../building_blocks/series_design/series_design_editor";
import { ChartShowDataMarkers } from "../building_blocks/show_data_markers/show_data_markers";
import { ChartShowValues } from "../building_blocks/show_values/show_values";

interface Props {
  chartId: UID;
  definition: RadarChartDefinition;
  canUpdateChart: (
    chartId: UID,
    definition: GenericDefinition<RadarChartDefinition>
  ) => DispatchResult;
  updateChart: (
    chartId: UID,
    definition: GenericDefinition<RadarChartDefinition>
  ) => DispatchResult;
}

export class RadarChartDesignPanel extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-RadarChartDesignPanel";
  static components = {
    GeneralDesignEditor,
    SeriesDesignEditor,
    Section,
    ChartLegend,
    ChartShowValues,
    ChartShowDataMarkers,
    Checkbox,
    ChartHumanizeNumbers,
  };
  static props = {
    chartId: String,
    definition: Object,
    canUpdateChart: Function,
    updateChart: Function,
  };
}
