import { SpreadsheetPivotRuntimeDefinition } from "@odoo/o-spreadsheet-engine/helpers/pivot/spreadsheet_pivot/runtime_definition_spreadsheet_pivot";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, onWillUpdateProps } from "@odoo/owl";
import { deepCopy, deepEquals, isDateTimeFormat } from "../../../helpers";
import {
  CellPosition,
  CellValueType,
  CriterionFilter,
  DataFilterValue,
  PivotFilter,
  filterDateCriterionOperators,
  filterNumberCriterionOperators,
  filterTextCriterionOperators,
} from "../../../types";
import { SidePanelCollapsible } from "../../side_panel/components/collapsible/side_panel_collapsible";
import { FilterMenuCriterion } from "../filter_menu_criterion/filter_menu_criterion";
import { FilterMenuValueList } from "../filter_menu_value_list/filter_menu_value_list";

interface Props {
  definition: SpreadsheetPivotRuntimeDefinition;
  filter: PivotFilter;
  filterPosition: CellPosition;
  values: Value[];
  onClosed?: () => void;
  onConfirmed: (updatedCriterionValue: DataFilterValue) => void;
}

interface Value {
  checked: boolean;
  string: string;
  scrolledTo?: "top" | "bottom" | undefined;
}

type CriterionCategory = "text" | "number" | "date";

export class PivotFilterMenu extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PivotFilterMenu";
  static props = {
    definition: Object,
    filter: Object,
    filterPosition: Object,
    values: Object,
    onClosed: { type: Function, optional: true },
    onConfirmed: Function,
  };

  static components = { FilterMenuValueList, SidePanelCollapsible, FilterMenuCriterion };

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

  private getCriterionCategory(cellPosition: CellPosition): CriterionCategory {
    const filteredZone = this.props.definition.range?.zone;
    if (!filteredZone) {
      return "text";
    }

    const cellTypesCount: Record<CriterionCategory, number> = { text: 0, number: 0, date: 0 };

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
    this.props.onConfirmed(this.updatedCriterionValue);
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

  getFilterCriterionValue(): CriterionFilter {
    const filterValue = this.props.filter;
    return filterValue.filterType === "criterion"
      ? deepCopy(filterValue)
      : { filterType: "criterion", type: "none", values: [] };
  }
}
