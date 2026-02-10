import { _t } from "@odoo/o-spreadsheet-engine/translation";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, ComponentConstructor, onWillUpdateProps, useState } from "@odoo/owl";
import { deepEquals } from "../../../helpers";
import {
  criterionComponentRegistry,
  getCriterionValueAndLabels,
} from "../../../registries/criterion_component_registry";
import { CriterionFilter, GenericCriterionType, ValueAndLabel } from "../../../types";
import { Select } from "../../select/select";

interface Props {
  criterion: CriterionFilter;
  criterionOperators: GenericCriterionType[];
  onCriterionChanged: (criterion: CriterionFilter) => void;
}

interface State {
  criterion: CriterionFilter;
}

export class FilterMenuCriterion extends Component<Props, SpreadsheetChildEnv> {
  static template = "o-spreadsheet-FilterMenuCriterion";
  static props = {
    criterion: Object,
    onCriterionChanged: Function,
    criterionOperators: Array,
  };
  static components = { Select };

  private state!: State;

  setup() {
    onWillUpdateProps((nextProps: Props) => {
      if (!deepEquals(nextProps.criterion, this.props.criterion)) {
        this.state.criterion = nextProps.criterion;
      }
    });

    this.state = useState({
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
