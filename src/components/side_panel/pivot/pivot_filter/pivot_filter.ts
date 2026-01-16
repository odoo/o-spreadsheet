import { _t, CellPosition, deepEquals, UID } from "@odoo/o-spreadsheet-engine";
import { SpreadsheetPivotRuntimeDefinition } from "@odoo/o-spreadsheet-engine/helpers/pivot/spreadsheet_pivot/runtime_definition_spreadsheet_pivot";
import { toLowerCase } from "@odoo/o-spreadsheet-engine/helpers/text_helper";
import { criterionEvaluatorRegistry } from "@odoo/o-spreadsheet-engine/registries/criterion_registry";
import { Cell } from "@odoo/o-spreadsheet-engine/types/cells";
import {
  PivotFilter,
  SpreadsheetPivotCoreDefinition,
} from "@odoo/o-spreadsheet-engine/types/pivot";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { DataFilterValue } from "@odoo/o-spreadsheet-engine/types/table";
import { Component, onWillUpdateProps, useExternalListener, useRef, useState } from "@odoo/owl";
import { PivotFilterMenu } from "../../../filters/pivot_filter_menu/pivot_filter_menu";
import { Popover } from "../../../popover";
import { PivotDimension } from "../pivot_layout_configurator/pivot_dimension/pivot_dimension";

interface Props {
  pivotId: UID;
  definition: SpreadsheetPivotRuntimeDefinition;
  filter: PivotFilter;
  onFiltersUpdated: (definition: Partial<SpreadsheetPivotCoreDefinition>) => void;
}

interface Value {
  checked: boolean;
  string: string;
  scrolledTo?: "top" | "bottom" | undefined;
}

interface State {
  values: Value[];
}

export class PivotFilterEditor extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PivotFilterEditor";
  static components = {
    PivotDimension,
    Popover,
    PivotFilterMenu,
  };
  static props = {
    pivotId: String,
    definition: Object,
    filter: Object,
    onFiltersUpdated: Function,
  };

  private state: State = useState({ values: [] });

  private buttonFilter = useRef("buttonFilter");
  private popover = useState({ isOpen: false });

  setup() {
    useExternalListener(window, "click", (ev) => {
      if (ev.target !== this.buttonFilter.el) {
        this.popover.isOpen = false;
      }
    });
    onWillUpdateProps((nextProps: Props) => {
      if (!deepEquals(nextProps.definition, this.props.definition)) {
        this.state.values = this.getFilterHiddenValues(nextProps);
      }
    });
    this.state.values = this.getFilterHiddenValues(this.props);
  }

  filterCaption() {
    if (this.props.filter.filterType === "criterion") {
      const evaluator = criterionEvaluatorRegistry.get(this.props.filter.type);
      return `${evaluator.name} "${this.props.filter.values}"`;
    }
    const numberOfHiddenValues = this.props.filter.hiddenValues.length;
    const totalValues = this.state.values.length;
    const numberOfShownValues = totalValues - numberOfHiddenValues;
    if (numberOfHiddenValues === 0) {
      return _t("showing all items");
    } else if (numberOfShownValues === 1) {
      return _t("showing 1 item");
    } else {
      return _t("showing %s items", numberOfShownValues);
    }
  }

  private getFilterHiddenValues(props: Props): Value[] {
    const pivot = this.env.model.getters.getPivot(this.props.pivotId);
    if (pivot.type !== "SPREADSHEET") {
      throw new Error("Filters are only available on spreadsheet pivot table");
    }
    const dataEntries = pivot.getDataEntries();
    const field = props.filter.fieldName;
    const set = new Set<string>();
    const values: (Value & { normalizedValue: string })[] = [];
    for (const dataEntry of dataEntries) {
      const value = dataEntry[field] ? dataEntry[field].formattedValue.toString() : "";
      const normalizedValue = toLowerCase(value);
      if (!set.has(normalizedValue)) {
        values.push({
          string: value,
          checked:
            props.filter.filterType === "criterion"
              ? true
              : !props.filter.hiddenValues.includes(value),
          normalizedValue,
        });
        set.add(normalizedValue);
      }
    }
    return values.sort((val1, val2) =>
      val1.normalizedValue.localeCompare(val2.normalizedValue, undefined, {
        numeric: true,
        sensitivity: "base",
      })
    );
  }

  get popoverProps() {
    const { x, y, width, height } = this.buttonFilter.el!.getBoundingClientRect();
    return {
      anchorRect: { x, y, width, height },
      positioning: "bottom-left",
    };
  }

  getCell(position: CellPosition): Cell | undefined {
    return this.env.model.getters.getCell(position);
  }

  removeFilter(filter: PivotFilter) {
    const { filters } = this.props.definition;
    this.props.onFiltersUpdated({
      filters: filters.filter((f) => f.fieldName !== filter.fieldName),
    });
  }

  openMenuFilter() {
    this.popover.isOpen = !this.popover.isOpen;
  }

  closeMenuFilter() {
    this.popover.isOpen = false;
  }

  updateFilterData(updatedCriterionValue: DataFilterValue) {
    const { filters } = this.props.definition;
    const filter = this.props.filter;
    const updatedFilters = filters.map((f) => {
      if (f.fieldName === filter.fieldName) {
        return {
          ...f,
          ...updatedCriterionValue,
        };
      }
      return f;
    });
    this.props.onFiltersUpdated({
      filters: updatedFilters,
    });
  }
}
