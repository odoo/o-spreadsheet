import { onWillUpdateProps, props, proxy } from "@odoo/owl";
import { deepEquals } from "../../../helpers/misc";
import { Component, ComponentConstructor } from "../../../owl3_compatibility_layer";
import {
  criterionComponentRegistry,
  getCriterionValueAndLabels,
} from "../../../registries/criterion_component_registry";
import { _t } from "../../../translation";
import { ValueAndLabel } from "../../../types/misc";
import { PropsOf } from "../../../types/props_of";
import { SpreadsheetChildEnv } from "../../../types/spreadsheet_env";
import { CriterionFilter } from "../../../types/table";
import { types } from "../../props_validation";
import { Select } from "../../select/select";

interface State {
  criterion: CriterionFilter;
}

export class FilterMenuCriterion extends Component<SpreadsheetChildEnv> {
  static template = "o-spreadsheet-FilterMenuCriterion";
  static components = { Select };

  protected props = props({
    criterion: types.CriterionFilter(),
    criterionOperators: types.array(types.GenericCriterionType()),
    onCriterionChanged: types.function<(criterion: CriterionFilter) => void>(),
  });

  private state!: State;

  setup() {
    onWillUpdateProps((nextProps: PropsOf<FilterMenuCriterion>) => {
      if (!deepEquals(nextProps.criterion, this.props.criterion)) {
        this.state.criterion = nextProps.criterion;
      }
    });

    this.state = proxy({
      criterion: this.props.criterion,
    });
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
