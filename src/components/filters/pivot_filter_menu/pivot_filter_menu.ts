import { onWillUpdateProps, props } from "@odoo/owl";
import { deepCopy, deepEquals } from "../../../helpers/misc";
import { SpreadsheetPivotRuntimeDefinition } from "../../../helpers/pivot/spreadsheet_pivot/runtime_definition_spreadsheet_pivot";
import { Component } from "../../../owl3_compatibility_layer";
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

type CriterionCategory = "char" | "boolean" | "integer" | "datetime";

export class PivotFilterMenu extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PivotFilterMenu";

  static components = { FilterMenuValueList, SidePanelCollapsible, FilterMenuCriterion };

  private criterionCategory: CriterionCategory = "char";
  private updatedCriterionValue: DataFilterValue | undefined;

  protected props = props({
    pivotId: types.UID(),
    definition: types.instanceOf(SpreadsheetPivotRuntimeDefinition),
    filter: types.PivotFilter(),
    values: types.array(
      types.object({
        checked: types.boolean(),
        string: types.string(),
        "scrolledTo?": types.or([types.literal("top"), types.literal("bottom")]),
      })
    ),
    "onClosed?": types.function(),
    onConfirmed: types.function<(updatedCriterionValue: DataFilterValue) => void>(),
  });

  setup() {
    onWillUpdateProps((nextProps: PropsOf<PivotFilterMenu>) => {
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
