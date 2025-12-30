import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, onWillUpdateProps, useState } from "@odoo/owl";
import { deepEquals, positions, toLowerCase } from "../../../helpers";
import { Position } from "../../../types";
import { FilterMenuValueItem } from "../filter_menu_item/filter_menu_value_item";
import { FilterMenuValueListBasic } from "../filter_menu_value_list_basic/filter_menu_value_list_basic";

interface Props {
  filterPosition: Position;
  onUpdateHiddenValues: (values: string[]) => void;
}

interface Value {
  checked: boolean;
  string: string;
  scrolledTo?: "top" | "bottom" | undefined;
}

interface State {
  values: Value[];
}

export class FilterMenuValueList extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-FilterMenuValueList";
  static props = {
    filterPosition: Object,
    onUpdateHiddenValues: Function,
  };
  static components = { FilterMenuValueItem, FilterMenuValueListBasic };

  private state: State = useState({ values: [] });

  setup() {
    onWillUpdateProps((nextProps: Props) => {
      if (!deepEquals(nextProps.filterPosition, this.props.filterPosition)) {
        this.state.values = this.getFilterHiddenValues(nextProps.filterPosition);
      }
    });
    this.state.values = this.getFilterHiddenValues(this.props.filterPosition);
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
    const normalizedFilteredValues = new Set(filterValues.map(toLowerCase));

    const set = new Set<string>();
    const values: (Value & { normalizedValue: string })[] = [];
    const addValue = (value: string) => {
      const normalizedValue = toLowerCase(value);
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
}
