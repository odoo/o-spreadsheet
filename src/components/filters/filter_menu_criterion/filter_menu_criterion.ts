import { Position } from "@odoo/o-spreadsheet-engine";
import { Component, ComponentConstructor, onWillUpdateProps, useState } from "@odoo/owl";
import { Action, createAction } from "../../../actions/action";
import { deepCopy, deepEquals } from "../../../helpers";
import {
  criterionComponentRegistry,
  getCriterionMenuItems,
} from "../../../registries/criterion_component_registry";
import { criterionEvaluatorRegistry } from "../../../registries/criterion_registry";
import { _t } from "../../../translation";
import { CriterionFilter, GenericCriterionType, SpreadsheetChildEnv } from "../../../types";
import { SelectMenu } from "../../side_panel/select_menu/select_menu";

interface Props {
  filterPosition: Position;
  criterionOperators: GenericCriterionType[];
  onCriterionChanged: (criterion: CriterionFilter) => void;
}

interface State {
  criterion: CriterionFilter;
}

export class FilterMenuCriterion extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-FilterMenuCriterion";
  static props = {
    filterPosition: Object,
    onCriterionChanged: Function,
    criterionOperators: Array,
  };
  static components = { SelectMenu };

  private state!: State;

  setup() {
    onWillUpdateProps((nextProps: Props) => {
      if (!deepEquals(nextProps.filterPosition, this.props.filterPosition)) {
        this.state.criterion = this.getFilterCriterionValue(nextProps.filterPosition);
      }
    });

    this.state = useState({
      criterion: this.getFilterCriterionValue(this.props.filterPosition),
    });
  }

  private getFilterCriterionValue(position: Position): CriterionFilter {
    const sheetId = this.env.model.getters.getActiveSheetId();
    const filterValue = this.env.model.getters.getFilterCriterionValue({ sheetId, ...position });
    return filterValue?.filterType === "criterion"
      ? deepCopy(filterValue)
      : { filterType: "criterion", type: "none", values: [] };
  }

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
