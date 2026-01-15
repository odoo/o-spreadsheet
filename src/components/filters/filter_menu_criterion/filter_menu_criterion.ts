import { _t } from "@odoo/o-spreadsheet-engine/translation";
import { SpreadsheetChildEnv } from "@odoo/o-spreadsheet-engine/types/spreadsheet_env";
import { Component, ComponentConstructor, onWillUpdateProps, useState } from "@odoo/owl";
import { deepCopy, deepEquals } from "../../../helpers";
import {
  criterionComponentRegistry,
  getCriterionValueAndLabels,
} from "../../../registries/criterion_component_registry";
import { CriterionFilter, GenericCriterionType, Position, ValueAndLabel } from "../../../types";
import { Select } from "../../select/select";

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
