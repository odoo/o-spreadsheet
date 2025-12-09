import { SpreadsheetPivotRuntimeDefinition } from "@odoo/o-spreadsheet-engine/helpers/pivot/spreadsheet_pivot/runtime_definition_spreadsheet_pivot";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, onWillUpdateProps } from "@odoo/owl";
import { deepEquals, isDateTimeFormat } from "../../../helpers";
import { interactiveSort } from "../../../helpers/sort_interactive";
import {
  CellPosition,
  CellValueType,
  CriterionFilter,
  DataFilterValue,
  PivotFilter,
  SortDirection,
  filterDateCriterionOperators,
  filterNumberCriterionOperators,
  filterTextCriterionOperators,
} from "../../../types";
import { SidePanelCollapsible } from "../../side_panel/components/collapsible/side_panel_collapsible";
import { FilterMenuCriterion } from "../filter_menu_criterion/filter_menu_criterion";
import { PivotFilterMenuValueList } from "../pivot_filter_menu_value_list/pivot_filter_menu_value_list";

interface Props {
  definition: SpreadsheetPivotRuntimeDefinition;
  filter: PivotFilter;
  filterPosition: CellPosition;
  onClosed?: () => void;
  onConfirmed: (hiddenValues: string[]) => void;
}

type CriterionCategory = "text" | "number" | "date";

export class PivotFilterMenu extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PivotFilterMenu";
  static props = {
    definition: Object,
    filter: Object,
    filterPosition: Object,
    onClosed: { type: Function, optional: true },
    onConfirmed: Function,
  };

  static components = { PivotFilterMenuValueList, SidePanelCollapsible, FilterMenuCriterion };

  private criterionCategory: CriterionCategory = "text";
  private updatedCriterionValue: DataFilterValue | undefined;

  setup() {
    onWillUpdateProps((nextProps: Props) => {
      if (!deepEquals(nextProps.filterPosition, this.props.filterPosition)) {
        this.updatedCriterionValue = undefined;
        this.criterionCategory = this.getCriterionCategory(nextProps.filterPosition);
      }
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
    return !this.env.model.getters.isReadonly() && coreTable?.type !== "dynamic";
  }

  get table() {
    return this.env.model.getters.getTable(this.props.filterPosition);
  }

  get filterValueType() {
    const filterValue = this.env.model.getters.getFilterValue(this.props.filterPosition);
    return filterValue?.filterType;
  }

  private getCriterionCategory(cellPosition: CellPosition): CriterionCategory {
    const filter = this.env.model.getters.getFilter(this.props.filterPosition);
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
      const cell = this.env.model.getters.getEvaluatedCell({
        sheetId: cellPosition.sheetId,
        row,
        col: cellPosition.col,
      });
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
    if (this.updatedCriterionValue.filterType === "values") {
      this.props.onConfirmed(this.updatedCriterionValue.hiddenValues);
    }
    this.props.onClosed?.();
    return;
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
}
