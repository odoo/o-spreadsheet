import { criterionEvaluatorRegistry } from "@odoo/o-spreadsheet-engine/registries/criterion_registry";
import { _t } from "@odoo/o-spreadsheet-engine/translation";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, ComponentConstructor, useState } from "@odoo/owl";
import { Action, createAction } from "../../../actions/action";
import { deepCopy } from "../../../helpers";
import {
  criterionComponentRegistry,
  getCriterionMenuItems,
} from "../../../registries/criterion_component_registry";
import { CriterionFilter, GenericCriterionType, PivotFilter } from "../../../types";
import { SelectMenu } from "../../side_panel/select_menu/select_menu";

interface Props {
  filter: PivotFilter;
  criterionOperators: GenericCriterionType[];
  onCriterionChanged: (criterion: CriterionFilter) => void;
}

interface State {
  criterion: CriterionFilter;
}

export class PivotFilterMenuCriterion extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-PivotFilterMenuCriterion";
  static props = {
    filter: Object,
    onCriterionChanged: Function,
    criterionOperators: Array,
  };
  static components = { SelectMenu };

  private state!: State;

  setup() {
    this.state = useState({
      criterion: this.getFilterCriterionValue(),
    });
  }

  private getFilterCriterionValue(): CriterionFilter {
    //dans le parent
    const filterValue = this.props.filter;
    return filterValue.filterType === "criterion"
      ? deepCopy(filterValue)
      : { filterType: "criterion", type: "none", values: [] };
  }

  //tout ce qui est en dessous est similaire
  get criterionMenuItems(): Action[] {
    const noCriterionMenuItem = createAction({
      name: _t("None"),
      id: "none",
      separator: true,
      execute: () => this.onCriterionTypeChange("none"),
    });
    return [
      noCriterionMenuItem,
      ...getCriterionMenuItems(
        (type) => this.onCriterionTypeChange(type),
        new Set(this.props.criterionOperators)
      ),
    ];
  }

  get selectedCriterionName(): string {
    return this.state.criterion.type === "none"
      ? _t("None")
      : criterionEvaluatorRegistry.get(this.state.criterion.type).name;
  }

  get criterionComponent(): ComponentConstructor | undefined {
    return this.state.criterion.type === "none"
      ? undefined
      : criterionComponentRegistry.get(this.state.criterion.type).component;
  }

  onCriterionChanged(criterion: CriterionFilter) {
    this.state.criterion.values = criterion.values;
    this.state.criterion.dateValue = criterion.dateValue;
    this.props.onCriterionChanged(this.state.criterion);
  }

  private onCriterionTypeChange(type: CriterionFilter["type"]) {
    this.state.criterion.type = type;
    this.props.onCriterionChanged(this.state.criterion);
  }
}
