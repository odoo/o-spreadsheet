import { Component, useExternalListener, useRef, useState } from "@odoo/owl";
import { ACTION_COLOR, BADGE_SELECTED_COLOR } from "../../../../constants";
import {
  ChartSubtypeProperties,
  chartCategories,
  chartSubtypeRegistry,
} from "../../../../registries/chart_types";
import { ChartDefinition, ChartType, SpreadsheetChildEnv, UID } from "../../../../types/index";
import { css, cssPropertiesToCss } from "../../../helpers/css";
import { isChildEvent } from "../../../helpers/dom_helpers";
import { Popover, PopoverProps } from "../../../popover";
import { Section } from "../../components/section/section";
import { MainChartPanelStore } from "../main_chart_panel/main_chart_panel_store";

css/* scss */ `
  .o-section .o-input.o-type-selector {
    height: 30px;
    padding-left: 35px;
    padding-top: 5px;
  }
  .o-type-selector-preview {
    left: 5px;
    top: 3px;
    .o-chart-preview {
      width: 24px;
      height: 24px;
    }
  }

  .o-popover .o-chart-select-popover {
    box-sizing: border-box;
    background: #fff;
    .o-chart-type-item {
      cursor: pointer;
      padding: 3px 6px;
      margin: 1px 2px;
      &.selected,
      &:hover {
        border: 1px solid ${ACTION_COLOR};
        background: ${BADGE_SELECTED_COLOR};
        padding: 2px 5px;
      }
      .o-chart-preview {
        width: 48px;
        height: 48px;
      }
    }
  }
`;

interface Props {
  figureId: UID;
  chartPanelStore: MainChartPanelStore;
}

interface ChartTypePickerState {
  popoverProps: PopoverProps | undefined;
  popoverStyle: string;
}

export class ChartTypePicker extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ChartTypePicker";
  static components = { Section, Popover };
  static props = { figureId: String, chartPanelStore: Object };

  categories = chartCategories;
  chartTypeByCategories: Record<string, ChartSubtypeProperties[]> = {};

  popoverRef = useRef("popoverRef");
  selectRef = useRef("selectRef");

  state = useState<ChartTypePickerState>({ popoverProps: undefined, popoverStyle: "" });

  setup(): void {
    useExternalListener(window, "pointerdown", this.onExternalClick, { capture: true });

    for (const subtypeProperties of chartSubtypeRegistry.getAll()) {
      if (this.chartTypeByCategories[subtypeProperties.category]) {
        this.chartTypeByCategories[subtypeProperties.category].push(subtypeProperties);
      } else {
        this.chartTypeByCategories[subtypeProperties.category] = [subtypeProperties];
      }
    }
  }

  onExternalClick(ev: MouseEvent) {
    if (
      isChildEvent(this.popoverRef.el?.parentElement, ev) ||
      isChildEvent(this.selectRef.el, ev)
    ) {
      return;
    }
    this.closePopover();
  }

  onTypeChange(type: ChartType) {
    this.props.chartPanelStore.changeChartType(this.props.figureId, type);
    this.closePopover();
  }

  private getChartDefinition(figureId: UID): ChartDefinition {
    return this.env.model.getters.getChartDefinition(figureId);
  }

  getSelectedChartSubtypeProperties(): ChartSubtypeProperties {
    const definition = this.getChartDefinition(this.props.figureId);
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
      positioning: "TopRight",
      verticalOffset: 0,
    };

    this.state.popoverStyle = cssPropertiesToCss({ width: `${width}px` });
  }

  private closePopover() {
    this.state.popoverProps = undefined;
  }
}
