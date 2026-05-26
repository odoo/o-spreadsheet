import { onWillUpdateProps, props, proxy, signal } from "@odoo/owl";
import { CellPosition, GenericCriterion } from "../../../..";
import { deepEquals } from "../../../../helpers/misc";
import { SpreadsheetPivotRuntimeDefinition } from "../../../../helpers/pivot/spreadsheet_pivot/runtime_definition_spreadsheet_pivot";
import { SpreadsheetPivot } from "../../../../helpers/pivot/spreadsheet_pivot/spreadsheet_pivot";
import { toTrimmedLowerCase } from "../../../../helpers/text_helper";
import { Component, useExternalListener } from "../../../../owl3_compatibility_layer";
import { criterionEvaluatorRegistry } from "../../../../registries/criterion_registry";
import { _t } from "../../../../translation";
import { Cell } from "../../../../types/cells";
import { PivotFilter, SpreadsheetPivotCoreDefinition } from "../../../../types/pivot";
import { PropsOf } from "../../../../types/props_of";
import { SpreadsheetChildEnv } from "../../../../types/spreadsheet_env";
import { DataFilterValue } from "../../../../types/table";
import { PivotFilterMenu } from "../../../filters/pivot_filter_menu/pivot_filter_menu";
import { isChildEvent } from "../../../helpers/dom_helpers";
import { Popover } from "../../../popover/popover";
import { types } from "../../../props_validation";
import { PivotDimension } from "../pivot_layout_configurator/pivot_dimension/pivot_dimension";

interface Value {
  checked: boolean;
  string: string;
  scrolledTo?: "top" | "bottom" | undefined;
}

interface State {
  values: Value[];
}

export class PivotFilterEditor extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PivotFilterEditor";
  static components = {
    PivotDimension,
    Popover,
    PivotFilterMenu,
  };

  protected props = props({
    pivotId: types.UID(),
    definition: types.instanceOf(SpreadsheetPivotRuntimeDefinition),
    filter: types.PivotFilter(),
    onFiltersUpdated: types.function<[definition: Partial<SpreadsheetPivotCoreDefinition>]>([
      types.SpreadsheetPivotCoreDefinition(),
    ]),
  });

  private state!: State;

  private buttonFilter = signal<HTMLElement | null>(null);
  private popover!: { isOpen: boolean };

  setup() {
    useExternalListener(window, "click", (ev) => {
      if (!isChildEvent(this.buttonFilter(), ev)) {
        this.popover.isOpen = false;
      }
    });
    onWillUpdateProps((nextProps: PropsOf<PivotFilterEditor>) => {
      if (!deepEquals(nextProps.definition, this.props.definition)) {
        this.state.values = this.getFilterHiddenValues(nextProps);
      }
    });
    this.popover = proxy({ isOpen: false });
    this.state = proxy({
      values: this.getFilterHiddenValues(this.props),
    });
  }

  filterCaption() {
    if (this.props.filter.filterType === "criterion") {
      if (this.props.filter.type === "none") {
        return _t("showing all items");
      }
      return criterionEvaluatorRegistry
        .get(this.props.filter.type)
        .getPreview(this.props.filter as GenericCriterion, this.env.model.getters);
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

  private getFilterHiddenValues(props: PropsOf<PivotFilterEditor>): Value[] {
    const pivot = this.env.model.getters.getPivot(props.pivotId) as SpreadsheetPivot;
    if (pivot.type !== "SPREADSHEET") {
      throw new Error("Filters are only available on spreadsheet pivot table");
    }
    const dataEntries = pivot.getDataEntries();
    const field = props.filter.fieldName;
    const set = new Set<string>();
    const values: (Value & { normalizedValue: string })[] = [];
    for (const dataEntry of dataEntries) {
      const value = dataEntry[field] ? dataEntry[field].formattedValue.toString() : "";
      if (!set.has(value)) {
        values.push({
          string: value,
          checked:
            props.filter.filterType === "criterion"
              ? true
              : !props.filter.hiddenValues.includes(value),
          normalizedValue: toTrimmedLowerCase(value),
        });
        set.add(value);
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
    const { x, y, width, height } = this.buttonFilter()?.getBoundingClientRect() ?? {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    };
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
      filters: (filters ?? []).filter((f) => f.fieldName !== filter.fieldName),
    });
  }

  openMenuFilter() {
    this.popover.isOpen = !this.popover.isOpen;
  }

  closeMenuFilter() {
    this.popover.isOpen = false;
  }

  isActive() {
    const filter = this.props.filter;
    if (filter.filterType === "criterion") {
      return filter.type !== "none";
    }
    return filter.hiddenValues.length > 0;
  }

  updateFilterData(updatedCriterionValue: DataFilterValue) {
    const { filters } = this.props.definition;
    const filter = this.props.filter;
    const updatedFilters = (filters ?? []).map((f) => {
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
