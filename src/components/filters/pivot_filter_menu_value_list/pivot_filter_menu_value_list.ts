import { SpreadsheetPivotRuntimeDefinition } from "@odoo/o-spreadsheet-engine/helpers/pivot/spreadsheet_pivot/runtime_definition_spreadsheet_pivot";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, onWillUpdateProps, useState } from "@odoo/owl";
import { deepEquals, positions, toLowerCase } from "../../../helpers";
import { CellPosition, PivotFilter } from "../../../types";
import { FilterMenuValueItem } from "../filter_menu_item/filter_menu_value_item";
import { FilterMenuValueListBasic } from "../filter_menu_value_list_basic/filter_menu_value_list_basic";

interface Props {
  filter: PivotFilter;
  definition: SpreadsheetPivotRuntimeDefinition;
  filterPosition: CellPosition;
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

export class PivotFilterMenuValueList extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PivotFilterMenuValueList";
  static props = {
    filter: Object,
    definition: Object,
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
    this.props.filter.numberOfValues = this.state.values.length;
  }

  private getFilterHiddenValues(cellPosition: CellPosition): Value[] {
    const zonePivot = this.props.definition.range?.zone;
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
        values.push({
          string: value || "",
          checked: !this.props.filter.hiddenValues.includes(value),
          normalizedValue,
        });
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
}
