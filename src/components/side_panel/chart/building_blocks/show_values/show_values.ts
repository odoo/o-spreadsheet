import { Component } from "@odoo/owl";
import { DispatchResult, SpreadsheetChildEnv, UID } from "../../../../../types";
import { Checkbox } from "../../../components/checkbox/checkbox";

type PartialDefinition = {
  readonly showValues?: boolean;
  readonly showValuesMode?: string;
  [key: string]: any;
};

interface Props {
  chartId: UID;
  definition: PartialDefinition;
  updateChart: (chartId: UID, definition: PartialDefinition) => DispatchResult;
  canUpdateChart: (chartId: UID, definition: PartialDefinition) => DispatchResult;
  defaultValue?: boolean;
  modes?: { value: string; label: string }[];
  onModeChanged?: (type: string) => void;
}

export class ChartShowValues extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-ChartShowValues";
  static components = {
    Checkbox,
  };
  static props = {
    chartId: String,
    definition: Object,
    updateChart: Function,
    canUpdateChart: Function,
    defaultValue: { type: Boolean, optional: true },
    modes: { type: Array, optional: true },
    onModeChanged: { type: Function, optional: true },
  };

  get shouldShowValues(): boolean {
    return this.props.definition.showValues ?? this.props.defaultValue ?? false;
  }

  get shouldShowOptions(): boolean {
    return !!this.props.modes?.length && !!this.props.onModeChanged;
  }

  onModeChanged(ev: Event) {
    const value = (ev.target as HTMLSelectElement).value;
    this.props.onModeChanged?.(value);
  }
}
