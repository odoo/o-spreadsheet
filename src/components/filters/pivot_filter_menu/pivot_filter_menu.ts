import { SpreadsheetPivotRuntimeDefinition } from "@odoo/o-spreadsheet-engine/helpers/pivot/spreadsheet_pivot/runtime_definition_spreadsheet_pivot";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, onWillUpdateProps } from "@odoo/owl";
import { deepCopy, deepEquals } from "../../../helpers";
import {
  CriterionFilter,
  DataFilterValue,
  PivotFilter,
  UID,
  filterDateCriterionOperators,
  filterNumberCriterionOperators,
  filterTextCriterionOperators,
} from "../../../types";
import { SidePanelCollapsible } from "../../side_panel/components/collapsible/side_panel_collapsible";
import { FilterMenuCriterion } from "../filter_menu_criterion/filter_menu_criterion";
import { FilterMenuValueList } from "../filter_menu_value_list/filter_menu_value_list";

interface Props {
  pivotId: UID;
  definition: SpreadsheetPivotRuntimeDefinition;
  filter: PivotFilter;
  values: Value[];
  onClosed?: () => void;
  onConfirmed: (updatedCriterionValue: DataFilterValue) => void;
}

interface Value {
  checked: boolean;
  string: string;
  scrolledTo?: "top" | "bottom" | undefined;
}

type CriterionCategory = "char" | "boolean" | "integer" | "datetime";

export class PivotFilterMenu extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PivotFilterMenu";
  static props = {
    pivotId: String,
    definition: Object,
    filter: Object,
    values: Object,
    onClosed: { type: Function, optional: true },
    onConfirmed: Function,
  };

  static components = { FilterMenuValueList, SidePanelCollapsible, FilterMenuCriterion };

  private criterionCategory: CriterionCategory = "char";
  private updatedCriterionValue: DataFilterValue | undefined;

  setup() {
    onWillUpdateProps((nextProps: Props) => {
      if (!deepEquals(nextProps.definition, this.props.definition)) {
        this.updatedCriterionValue = undefined;
        this.criterionCategory = this.getCriterionCategory();
      }
    });
    this.criterionCategory = this.getCriterionCategory();
  }

  private getCriterionCategory(): CriterionCategory {
    const pivot = this.env.model.getters.getPivot(this.props.pivotId);
    const fields = pivot.getFields();
    const criterionCategory = fields[this.props.filter.fieldName]?.type;
    return (criterionCategory || "char") as CriterionCategory;
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
    if (this.criterionCategory === "datetime") {
      return filterDateCriterionOperators;
    } else if (this.criterionCategory === "integer") {
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
