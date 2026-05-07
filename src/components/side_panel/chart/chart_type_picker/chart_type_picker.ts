import { proxy, signal } from "@odoo/owl";
import { Component, useExternalListener } from "../../../../owl3_compatibility_layer";
import { chartDataSourceRegistry } from "../../../../registries/chart_data_source_registry";
import { chartSubtypeRegistry } from "../../../../registries/chart_subtype_registry";
import { CHART_TYPES, ChartDefinition, ChartType } from "../../../../types/chart/chart";
import {
  chartCategories,
  ChartSubtypeProperties,
} from "../../../../types/chart_subtype_properties";
import { UID } from "../../../../types/misc";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { cssPropertiesToCss } from "../../../helpers/css";
import { isChildEvent } from "../../../helpers/dom_helpers";
import { Popover, PopoverProps } from "../../../popover/popover";
import { Section } from "../../components/section/section";
import { MainChartPanelStore } from "../main_chart_panel/main_chart_panel_store";

interface Props {
  chartId: UID;
  chartPanelStore: MainChartPanelStore;
}

interface ChartTypePickerState {
  popoverProps: PopoverProps | undefined;
  popoverStyle: string;
}

export class ChartTypePicker extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ChartTypePicker";
  static components = { Section, Popover };
  static props = { chartId: String, chartPanelStore: Object };

  categories = chartCategories;
  chartTypeByCategories: Record<string, ChartSubtypeProperties[]> = {};

  popoverRef = signal<HTMLElement | null>(null);
  selectRef = signal<HTMLElement | null>(null);

  state = proxy<ChartTypePickerState>({ popoverProps: undefined, popoverStyle: "" });

  setup(): void {
    useExternalListener(window, "pointerdown", this.onExternalClick, { capture: true });

    const definition = this.env.model.getters.getChartDefinition(this.props.chartId);
    const supportedTypes = this.getSupportedChartTypes(definition);

    for (const subtypeProperties of chartSubtypeRegistry.getAll()) {
      if (!supportedTypes.has(subtypeProperties.chartType)) {
        continue;
      }
      if (this.chartTypeByCategories[subtypeProperties.category]) {
        this.chartTypeByCategories[subtypeProperties.category].push(subtypeProperties);
      } else {
        this.chartTypeByCategories[subtypeProperties.category] = [subtypeProperties];
      }
    }
  }

  private getSupportedChartTypes(definition: ChartDefinition): Set<ChartType> {
    let supportedTypes: Set<ChartType>;

    if (definition.dataSource) {
      const dataSourceBuilder = chartDataSourceRegistry.get(definition.dataSource.type);
      supportedTypes = new Set(dataSourceBuilder.supportedChartTypes);
    } else if (!definition.dataSource && definition.type === "bubble") {
      // Bubble charts don't have a data source but can still be converted to other types of charts
      supportedTypes = new Set(CHART_TYPES);
    } else {
      throw new Error("Missing chart data source for a chart type that requires it");
    }
    return supportedTypes;
  }

  onExternalClick(ev: MouseEvent) {
    if (isChildEvent(this.popoverRef()?.parentElement, ev) || isChildEvent(this.selectRef(), ev)) {
      return;
    }
    this.closePopover();
  }

  onTypeChange(type: ChartType) {
    this.props.chartPanelStore.changeChartType(this.props.chartId, type);
    this.closePopover();
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

    this.state.popoverStyle = cssPropertiesToCss({ width: `${width}px` });
  }

  private closePopover() {
    this.state.popoverProps = undefined;
  }
}
