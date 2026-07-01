import { props, proxy, signal } from "@odoo/owl";
import { Component } from "../../../../owl3_compatibility_layer";
import { chartDataSourceRegistry } from "../../../../registries/chart_data_source_registry";
import { chartSubtypeRegistry } from "../../../../registries/chart_subtype_registry";
import { CHART_TYPES, ChartDefinition, ChartType } from "../../../../types/chart/chart";
import { ChartSubtypeProperties } from "../../../../types/chart_subtype_properties";
import { UID } from "../../../../types/misc";
import { PropsOf } from "../../../../types/props_of";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { Popover } from "../../../popover/popover";
import { types } from "../../../props_validation";
import { Section } from "../../components/section/section";
import { ChartTypePickerPopover } from "../chart_type_picker_popover/chart_type_picker_popover";
import { MainChartPanelStore } from "../main_chart_panel/main_chart_panel_store";

interface ChartTypePickerState {
  popoverProps: PropsOf<Popover> | undefined;
  popoverWidth: number;
}

export class ChartTypePicker extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ChartTypePicker";
  static components = { Section, ChartTypePickerPopover };

  protected props = props({
    chartId: types.UID(),
    chartPanelStore: types.Store<MainChartPanelStore>(),
  });

  selectRef = signal<HTMLElement | null>(null);

  state = proxy<ChartTypePickerState>({ popoverProps: undefined, popoverWidth: 0 });

  getSupportedChartTypes(): Set<ChartType> {
    let supportedTypes: Set<ChartType>;

    const definition = this.getChartDefinition(this.props.chartId);
    if (definition.dataSource) {
      const dataSourceBuilder = chartDataSourceRegistry.get(definition.dataSource.type);
      supportedTypes = new Set(dataSourceBuilder.supportedChartTypes);
    } else if (
      !definition.dataSource &&
      (definition.type === "scorecard" ||
        definition.type === "gauge" ||
        definition.type === "bubble")
    ) {
      // Scorecard and gauge don't have a data source but can still be converted to other types of charts
      supportedTypes = new Set(CHART_TYPES);
    } else {
      throw new Error("Missing chart data source for a chart type that requires it");
    }
    return supportedTypes;
  }

  onTypeChange(type: ChartType) {
    this.props.chartPanelStore.changeChartType(this.props.chartId, type);
  }

  private getChartDefinition(chartId: UID): ChartDefinition {
    return this.env.model.getters.getChartDefinition(chartId);
  }

  getSelectedChartSubtypeProperties(): ChartSubtypeProperties {
    const definition = this.getChartDefinition(this.props.chartId);
    const matchedChart = chartSubtypeRegistry
      .getAll()
      .find((c) => c.matcher?.(definition) || false);
    return matchedChart || chartSubtypeRegistry.get(definition.type);
  }

  onPointerDown(ev: PointerEvent) {
    if (this.state.popoverProps) {
      this.closePopover();
      return;
    }
    const target = ev.currentTarget as HTMLElement;
    const { bottom, right, width } = target.getBoundingClientRect();
    this.state.popoverProps = {
      anchorRect: { x: right, y: bottom, width: 0, height: 0 },
      positioning: "top-right",
      verticalOffset: 0,
    };

    this.state.popoverWidth = width;
  }

  closePopover() {
    this.state.popoverProps = undefined;
  }
}
