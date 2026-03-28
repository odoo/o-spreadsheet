import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, onWillUpdateProps, useState } from "@odoo/owl";
import {
  deepCopy,
  deepEquals,
  isDateTimeFormat,
  positions,
  toTrimmedLowerCase,
} from "../../../helpers";
import { interactiveSort } from "../../../helpers/sort_interactive";
import {
  CellValueType,
  CriterionFilter,
  DataFilterValue,
  Position,
  SortDirection,
  filterDateCriterionOperators,
  filterNumberCriterionOperators,
  filterTextCriterionOperators,
} from "../../../types";
import { CellPopoverComponent, PopoverBuilders } from "../../../types/cell_popovers";
import { SidePanelCollapsible } from "../../side_panel/components/collapsible/side_panel_collapsible";
import { FilterMenuCriterion } from "../filter_menu_criterion/filter_menu_criterion";
import { FilterMenuValueList } from "../filter_menu_value_list/filter_menu_value_list";

interface Props {
  filterPosition: Position;
  onClosed?: () => void;
}

interface State {
  values: Value[];
}

interface Value {
  checked: boolean;
  string: string;
  scrolledTo?: "top" | "bottom" | undefined;
}

type CriterionCategory = "text" | "number" | "date";

export class FilterMenu extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-FilterMenu";
  static props = {
    filterPosition: Object,
    onClosed: { type: Function, optional: true },
  };
  static components = { FilterMenuValueList, SidePanelCollapsible, FilterMenuCriterion };
  private state: State = useState({ values: [] });
  private criterionCategory: CriterionCategory = "text";
  private updatedCriterionValue: DataFilterValue | undefined;

  setup() {
    onWillUpdateProps((nextProps: Props) => {
      if (!deepEquals(nextProps.filterPosition, this.props.filterPosition)) {
        this.updatedCriterionValue = undefined;
        this.criterionCategory = this.getCriterionCategory(nextProps.filterPosition);
        this.state.values = this.getFilterHiddenValues(nextProps.filterPosition);
      }
    });
    this.criterionCategory = this.getCriterionCategory(this.props.filterPosition);
    this.state.values = this.getFilterHiddenValues(this.props.filterPosition);
  }

  get isSortable() {
    if (!this.table) {
      return false;
    }
    const coreTable = this.env.model.getters.getCoreTableMatchingTopLeft(
      this.table.range.sheetId,
      this.table.range.zone
    );
    return !this.env.model.getters.isReadonly() && coreTable?.type !== "dynamic";
  }

  get table() {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const position = this.props.filterPosition;
    return this.env.model.getters.getTable({ sheetId, ...position });
  }

  get filterValueType() {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const position = this.props.filterPosition;
    const filterValue = this.env.model.getters.getFilterValue({ sheetId, ...position });
    return filterValue?.filterType;
  }

  private getCriterionCategory(position: Position): CriterionCategory {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const filter = this.env.model.getters.getFilter({ sheetId, ...position });
    if (!filter || !filter.filteredRange) {
      return "text";
    }

    const cellTypesCount: Record<CriterionCategory, number> = { text: 0, number: 0, date: 0 };
    const filteredZone = filter.filteredRange.zone;

    for (let row = filteredZone.top; row <= filteredZone.bottom; row++) {
      // 100 rows should be enough to determine the type, let's not loop on 10,000 rows for nothing
      if (row > 100) {
        break;
      }
      const cell = this.env.model.getters.getEvaluatedCell({ sheetId, row, col: position.col });
      if (cell.type === CellValueType.text || cell.type === CellValueType.boolean) {
        cellTypesCount.text++;
      } else if (cell.type === CellValueType.number) {
        if (cell.format && isDateTimeFormat(cell.format)) {
          cellTypesCount.date++;
        } else {
          cellTypesCount.number++;
        }
      }
    }

    const max = Math.max(cellTypesCount.text, cellTypesCount.number, cellTypesCount.date);
    const type = Object.keys(cellTypesCount).find((key) => cellTypesCount[key] === max);
    return (type || "text") as CriterionCategory;
  }

  onUpdateHiddenValues(values: string[]) {
    this.updatedCriterionValue = { filterType: "values", hiddenValues: values };
  }

  onCriterionChanged(criterion: CriterionFilter) {
    this.updatedCriterionValue = criterion;
  }

  confirm() {
    if (!this.updatedCriterionValue) {
      this.props.onClosed?.();
      return;
    }
    const position = this.props.filterPosition;
    this.env.model.dispatch("UPDATE_FILTER", {
      ...position,
      sheetId: this.env.model.getters.getActiveSheetId(),
      value: this.updatedCriterionValue,
    });
    this.props.onClosed?.();
  }

  get criterionOperators() {
    if (this.criterionCategory === "date") {
      return filterDateCriterionOperators;
    } else if (this.criterionCategory === "number") {
      return filterNumberCriterionOperators;
    }
    return filterTextCriterionOperators;
  }

  cancel() {
    this.props.onClosed?.();
  }

  sortFilterZone(sortDirection: SortDirection) {
    const filterPosition = this.props.filterPosition;
    const table = this.table;
    const tableZone = table?.range.zone;
    if (!filterPosition || !tableZone || tableZone.top === tableZone.bottom) {
      return;
    }
    const sheetId = this.env.model.getters.getActiveSheetId();
    const contentZone = { ...tableZone, top: tableZone.top + 1 };
    const sortAnchor = { col: filterPosition.col, row: contentZone.top };
    const sortOptions = { emptyCellAsZero: true, sortHeaders: true };
    interactiveSort(this.env, sheetId, sortAnchor, contentZone, sortDirection, sortOptions);
    this.props.onClosed?.();
  }

  private getFilterHiddenValues(position: Position): Value[] {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const filter = this.env.model.getters.getFilter({ sheetId, ...position });
    if (!filter) {
      return [];
    }
    const filterValue = this.env.model.getters.getFilterValue({ sheetId, ...position });
    let cells = (filter.filteredRange ? positions(filter.filteredRange.zone) : []).map(
      (position) => ({
        position,
        cellValue: this.env.model.getters.getEvaluatedCell({ sheetId, ...position }).formattedValue,
      })
    );
    if (filterValue?.filterType !== "criterion") {
      cells = cells.filter((val) => !this.env.model.getters.isRowHidden(sheetId, val.position.row));
    }

    const cellValues = cells.map((val) => val.cellValue);
    const filterValues = filterValue?.filterType === "values" ? filterValue.hiddenValues : [];
    const normalizedFilteredValues = new Set(filterValues.map(toTrimmedLowerCase));

    const set = new Set<string>();
    const values: (Value & { normalizedValue: string })[] = [];
    const addValue = (value: string) => {
      const normalizedValue = toTrimmedLowerCase(value);
      if (!set.has(normalizedValue)) {
        values.push({
          string: value || "",
          checked:
            filterValue?.filterType !== "criterion"
              ? !normalizedFilteredValues.has(normalizedValue)
              : false,
          normalizedValue,
        });
        set.add(normalizedValue);
      }
    };
    cellValues.forEach(addValue);
    filterValues.forEach(addValue);

    return values.sort((val1, val2) =>
      val1.normalizedValue.localeCompare(val2.normalizedValue, undefined, {
        numeric: true,
        sensitivity: "base",
      })
    );
  }

  getFilterCriterionValue(position: Position): CriterionFilter {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const filterValue = this.env.model.getters.getFilterCriterionValue({ sheetId, ...position });
    return filterValue?.filterType === "criterion"
      ? deepCopy(filterValue)
      : { filterType: "criterion", type: "none", values: [] };
  }
}

export const FilterMenuPopoverBuilder: PopoverBuilders = {
  onOpen: (position, getters): CellPopoverComponent<typeof FilterMenu> => {
    return {
      isOpen: true,
      props: { filterPosition: position },
      Component: FilterMenu,
      cellCorner: "bottom-left",
    };
  },
};
