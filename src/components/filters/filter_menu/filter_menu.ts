import { onWillUpdateProps, props, proxy } from "@odoo/owl";
import { isDateTimeFormat } from "../../../helpers/format/format";
import { deepCopy, deepEquals } from "../../../helpers/misc";
import { interactiveSort } from "../../../helpers/sort_interactive";
import { toTrimmedLowerCase } from "../../../helpers/text_helper";
import { positions } from "../../../helpers/zones";
import { Component } from "../../../owl3_compatibility_layer";
import { CellPopoverComponent, PopoverBuilders } from "../../../types/cell_popovers";
import { CellValueType } from "../../../types/cells";
import { Position, SortDirection } from "../../../types/misc";
import { PropsOf } from "../../../types/props_of";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import {
  CriterionFilter,
  DataFilterValue,
  filterDateCriterionOperators,
  filterNumberCriterionOperators,
  filterTextCriterionOperators,
} from "../../../types/table";
import { types } from "../../props_validation";
import { SidePanelCollapsible } from "../../side_panel/components/collapsible/side_panel_collapsible";
import { FilterMenuCriterion } from "../filter_menu_criterion/filter_menu_criterion";
import { FilterMenuValueList } from "../filter_menu_value_list/filter_menu_value_list";

interface State {
  values: Value[];
}

interface Value {
  checked: boolean;
  string: string;
  scrolledTo?: "top" | "bottom" | undefined;
}

type CriterionCategory = "text" | "number" | "date";

export class FilterMenu extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-FilterMenu";
  static components = { FilterMenuValueList, SidePanelCollapsible, FilterMenuCriterion };

  private props = props({
    filterPosition: types.Position(),
    onClosed: types.function().optional(),
  });

  private state!: State;
  private criterionCategory: CriterionCategory = "text";
  private updatedCriterionValue: DataFilterValue | undefined;

  setup() {
    onWillUpdateProps((nextProps: PropsOf<FilterMenu>) => {
      if (!deepEquals(nextProps.filterPosition, this.props.filterPosition)) {
        this.updatedCriterionValue = undefined;
        this.criterionCategory = this.getCriterionCategory(nextProps.filterPosition);
        this.state.values = this.getFilterHiddenValues(nextProps.filterPosition);
      }
    });
    this.state = proxy({
      values: this.getFilterHiddenValues(this.props.filterPosition),
    });
    this.criterionCategory = this.getCriterionCategory(this.props.filterPosition);
  }

  get isSortable() {
    if (!this.table) {
      return false;
    }
    const coreTable = this.env.model.getters.getCoreTableMatchingTopLeft(
      this.table.range.sheetId,
      this.table.range.zone
    );
    return coreTable?.type !== "dynamic";
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
    if (!filter?.filteredRange) {
      return [];
    }
    const filterValue = this.env.model.getters.getFilterValue({ sheetId, ...position });
    let cellPositions = positions(filter.filteredRange.zone);
    if (filterValue?.filterType !== "criterion") {
      cellPositions = cellPositions.filter(
        (currentPosition) => !this.env.model.getters.isRowHidden(sheetId, currentPosition.row)
      );
    }
    const cellValues = cellPositions.map(
      (currentPosition) =>
        this.env.model.getters.getEvaluatedCell({ sheetId, ...currentPosition }).formattedValue
    );

    const filterValues = filterValue?.filterType === "values" ? filterValue.hiddenValues : [];
    const normalizedFilteredValues = new Set(filterValues.map(toTrimmedLowerCase));

    const normalizedValues = new Set<string>();
    const allValues: (Value & { normalizedValue: string })[] = [];
    const addValue = (value: string) => {
      const normalizedValue = toTrimmedLowerCase(value);
      if (!normalizedValues.has(normalizedValue)) {
        allValues.push({
          string: value || "",
          checked:
            filterValue?.filterType !== "criterion"
              ? !normalizedFilteredValues.has(normalizedValue)
              : false,
          normalizedValue,
        });
        normalizedValues.add(normalizedValue);
      }
    };
    cellValues.forEach(addValue);
    filterValues.forEach(addValue);

    return allValues.sort((val1, val2) =>
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
