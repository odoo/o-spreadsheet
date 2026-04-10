import { RadarChartDefinition } from "../../../../types/chart/radar_chart";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { Checkbox } from "../../components/checkbox/checkbox";
import { Section } from "../../components/section/section";
import { GeneralDesignEditor } from "../building_blocks/general_design/general_design_editor";
import { ChartHumanizeNumbers } from "../building_blocks/humanize_numbers/humanize_numbers";
import { ChartLegend } from "../building_blocks/legend/legend";
import { SeriesDesignEditor } from "../building_blocks/series_design/series_design_editor";
import { ChartShowDataMarkers } from "../building_blocks/show_data_markers/show_data_markers";
import { ChartShowValues } from "../building_blocks/show_values/show_values";
import { ChartSidePanelProps, ChartSidePanelPropsObject } from "../common";

import { Component } from "../../../../owl3_compatibility_layer";
export class RadarChartDesignPanel extends Component<
  ChartSidePanelProps<RadarChartDefinition<string>>,
  SpreadsheetChildEnv
> {
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
  static props = ChartSidePanelPropsObject;
}
