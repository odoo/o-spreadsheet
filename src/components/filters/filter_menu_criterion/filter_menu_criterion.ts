import { Component, ComponentConstructor, onWillUpdateProps, useState } from "@odoo/owl";
import { deepCopy, deepEquals } from "../../../helpers";
import {
  criterionComponentRegistry,
  getCriterionValueAndLabels,
} from "../../../registries/criterion_component_registry";
<<<<<<< 8490ed8d266544079acdc5678894e96e8bfd8a58
import { _t } from "../../../translation";
import { CriterionFilter, GenericCriterionType, Position, ValueAndLabel } from "../../../types";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { Select } from "../../select/select";
||||||| 45e20d4f992094d0d495cf73ffb15774c2b2e405
import { CriterionFilter, GenericCriterionType, Position } from "../../../types";
import { SelectMenu } from "../../side_panel/select_menu/select_menu";
=======
import { criterionEvaluatorRegistry } from "../../../registries/criterion_registry";
import { _t } from "../../../translation";
import { CriterionFilter, GenericCriterionType, Position } from "../../../types";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { SelectMenu } from "../../side_panel/select_menu/select_menu";
>>>>>>> 00785254412bf55cc6e4fbd752bc9894462c96db

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
  static components = { Select };

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

  get criterionOptions(): ValueAndLabel[] {
    return [
      { label: _t("None"), value: "none" },
      ...getCriterionValueAndLabels(new Set(this.props.criterionOperators)),
    ];
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

  onCriterionTypeChange(type: CriterionFilter["type"]) {
    this.state.criterion.type = type;
    this.props.onCriterionChanged(this.state.criterion);
  }
}
