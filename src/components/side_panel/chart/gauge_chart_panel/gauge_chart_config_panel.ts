import { proxy } from "@odoo/owl";
import { Component } from "../../../../owl3_compatibility_layer";
import { GaugeChartDefinition } from "../../../../types/chart/gauge_chart";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { ChartDataSourceComponent } from "../building_blocks/data_source/data_source";
import { ChartErrorSection } from "../building_blocks/error_section/error_section";
import { ChartSidePanelProps, ChartSidePanelPropsObject } from "../common";

interface PanelState {
  errorMessages: string[];
}

export class GaugeChartConfigPanel extends Component<
  ChartSidePanelProps<GaugeChartDefinition>,
  SpreadsheetChildEnv
> {
  static template = "o-spreadsheet-GaugeChartConfigPanel";
  static components = { ChartDataSourceComponent, ChartErrorSection };
  static props = ChartSidePanelPropsObject;

  protected state = proxy<PanelState>({
    errorMessages: [],
  });

  onErrorMessagesChanged(errorMessages: string[]) {
    this.state.errorMessages = errorMessages;
  }

  get errorMessages(): string[] {
    return this.state.errorMessages;
  }
}
