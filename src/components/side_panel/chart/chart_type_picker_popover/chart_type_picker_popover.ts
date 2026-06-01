import { props, signal } from "@odoo/owl";
import { Component, useExternalListener } from "../../../../owl3_compatibility_layer";
import { chartSubtypeRegistry } from "../../../../registries/chart_subtype_registry";
import { ChartType } from "../../../../types/chart/chart";
import {
  chartCategories,
  ChartSubtypeProperties,
} from "../../../../types/chart_subtype_properties";
import { PropsOf } from "../../../../types/props_of";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { cssPropertiesToCss } from "../../../helpers/css";
import { isChildEvent } from "../../../helpers/dom_helpers";
import { Popover } from "../../../popover/popover";
import { types } from "../../../props_validation";

export class ChartTypePickerPopover extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ChartTypePickerPopover";
  static components = { Popover };

  protected props = props({
    width: types.number(),
    parentRef: types.signal<HTMLElement | null>().optional(),
    onClose: types.function(),
    onSelectSubType: types.function<(type: string) => void>(),
    supportedTypes: types.object<Set<ChartType>>(),
    selectedChartSubType: types.string().optional(),
    popoverProps: types.object<PropsOf<Popover>>(),
  });

  categories = chartCategories;
  chartTypeByCategories: Record<string, ChartSubtypeProperties[]> = {};

  popoverRef = signal<HTMLElement | null>(null);

  setup(): void {
    useExternalListener(window, "pointerdown", this.onExternalClick, { capture: true });

    for (const subtypeProperties of chartSubtypeRegistry.getAll()) {
      if (!this.props.supportedTypes.has(subtypeProperties.chartType)) {
        continue;
      }
      if (this.chartTypeByCategories[subtypeProperties.category]) {
        this.chartTypeByCategories[subtypeProperties.category].push(subtypeProperties);
      } else {
        this.chartTypeByCategories[subtypeProperties.category] = [subtypeProperties];
      }
    }
  }

  onExternalClick(ev: MouseEvent) {
    if (
      isChildEvent(this.popoverRef()?.parentElement, ev) ||
      isChildEvent(this.props.parentRef?.(), ev)
    ) {
      return;
    }
    this.props.onClose();
  }

  onTypeChange(type: ChartType) {
    this.props.onSelectSubType(type);
    this.props.onClose();
  }

  get popoverStyle() {
    return cssPropertiesToCss({ width: `${this.props.width}px` });
  }
}
