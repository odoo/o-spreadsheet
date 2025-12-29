import { _t, CellPosition, deepEquals, UID } from "@odoo/o-spreadsheet-engine";
import { SpreadsheetPivotRuntimeDefinition } from "@odoo/o-spreadsheet-engine/helpers/pivot/spreadsheet_pivot/runtime_definition_spreadsheet_pivot";
import { toLowerCase } from "@odoo/o-spreadsheet-engine/helpers/text_helper";
import { positions } from "@odoo/o-spreadsheet-engine/helpers/zones";
import { criterionEvaluatorRegistry } from "@odoo/o-spreadsheet-engine/registries/criterion_registry";
import { Cell } from "@odoo/o-spreadsheet-engine/types/cells";
import {
  PivotFilter,
  PivotValuesFilter,
  SpreadsheetPivotCoreDefinition,
} from "@odoo/o-spreadsheet-engine/types/pivot";
import { DataFilterValue } from "@odoo/o-spreadsheet-engine/types/table";
import { Component, onWillUpdateProps, useExternalListener, useRef, useState } from "@odoo/owl";
import { PivotFilterMenu } from "../../../filters/pivot_filter_menu/pivot_filter_menu";
import { Popover } from "../../../popover";
import { PivotDimension } from "../pivot_layout_configurator/pivot_dimension/pivot_dimension";

interface Props {
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

export class PivotFilterEditor extends Component<Props> {
  static template = "o-spreadsheet-PivotFilterEditor";
  static components = {
    PivotDimension,
    Popover,
    PivotFilterMenu,
  };
  static props = {
    definition: Object,
    filter: Object,
    onFiltersUpdated: Function,
  };

  private state: State = useState({ values: [] });

  private buttonFilter = useRef("buttonFilter");
  private popover = useState({ isOpen: false });

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

  setup() {
    useExternalListener(window, "click", (ev) => {
      if (ev.target !== this.buttonFilter.el) {
        this.popover.isOpen = false;
      }
    });
    onWillUpdateProps((nextProps: Props) => {
      if (!deepEquals(nextProps.filter, this.props.filter)) {
        const nextPosition = this.filterPosition(nextProps.filter);
        if (nextPosition) {
          this.state.values = this.getFilterHiddenValues(nextPosition, nextProps);
        } else {
          this.props.filter.isValid = false;
        }
      }
    });
    this.state.values = this.getFilterHiddenValues(
      this.filterPosition(this.props.filter),
      this.props
    );
  }

  private getFilterHiddenValues(cellPosition: CellPosition | undefined, props: Props): Value[] {
    if (!cellPosition) {
      return [];
    }
    const zonePivot = props.definition.range?.zone;
    const zoneFilter = zonePivot
      ? {
          left: cellPosition.col,
          right: cellPosition.col,
          top: zonePivot.top + 1,
          bottom: zonePivot.bottom,
        }
      : null;

    const cells = (zoneFilter ? positions(zoneFilter) : []).map((position) => ({
      position,
      cellValue: this.env.model.getters.getEvaluatedCell({
        sheetId: cellPosition.sheetId,
        ...position,
      }).formattedValue,
    }));

    const cellValues = cells.map((val) => val.cellValue);

    const set = new Set<string>();
    const values: (Value & { normalizedValue: string })[] = [];
    const addValue = (value: string) => {
      const normalizedValue = toLowerCase(value);
      if (!set.has(normalizedValue)) {
        if (props.filter.filterType === "criterion") {
          values.push({
            string: value || "",
            checked: true,
            normalizedValue,
          });
        } else {
          values.push({
            string: value || "",
            checked: !(props.filter as PivotValuesFilter).hiddenValues.includes(value),
            normalizedValue,
          });
        }
        set.add(normalizedValue);
      }
    };
    cellValues.forEach(addValue);

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

  filterPosition(filter: PivotFilter): CellPosition | undefined {
    if (!this.props.definition.range) {
      throw new Error("No range defined for the pivot");
    }
    const zone = this.props.definition.range?.zone;
    const sheetId = this.props.definition.range?.sheetId as UID;
    for (let col = zone.left; col <= zone.right; col++) {
      const position = { sheetId, row: zone.top, col };
      const cell = this.getCell(position);
      if (cell) {
        const content = cell.content;
        if (content === filter.displayName) {
          return { sheetId, col, row: zone.top };
        }
      }
    }
    return;
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
