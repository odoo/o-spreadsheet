import { cssPropertiesToCss } from "@odoo/o-spreadsheet-engine/components/helpers/css";
import { chartSubtypeRegistry } from "@odoo/o-spreadsheet-engine/registries/chart_subtype_registry";
import {
  chartCategories,
  ChartSubtypeProperties,
} from "@odoo/o-spreadsheet-engine/types/chart_subtype_properties";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, useRef, useState } from "@odoo/owl";
import { ChartDefinition, ChartType, UID } from "../../../../types/index";
import { Popover, PopoverProps } from "../../../popover";
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

  popoverRef = useRef("popoverRef");
  selectRef = useRef("selectRef");

  state = useState<ChartTypePickerState>({ popoverProps: undefined, popoverStyle: "" });

  setup(): void {
    for (const subtypeProperties of chartSubtypeRegistry.getAll()) {
      if (this.chartTypeByCategories[subtypeProperties.category]) {
        this.chartTypeByCategories[subtypeProperties.category].push(subtypeProperties);
      } else {
        this.chartTypeByCategories[subtypeProperties.category] = [subtypeProperties];
      }
    }
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
      onClose: this.closePopover.bind(this),
      rootElement: this.selectRef.el,
    };

    this.state.popoverStyle = cssPropertiesToCss({ width: `${width}px` });
  }

  private closePopover() {
    this.state.popoverProps = undefined;
  }
}
